import { Address, IStorage, Output } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { flatten, maxBy, random, range, some, sortBy } from "lodash";
import { IExplorer } from "./explorer/types";
import { ICrypto } from "./crypto/types";
import { IWallet } from "./types";

class Wallet extends EventEmitter implements IWallet {
  storage: IStorage;
  explorer: IExplorer;
  crypto: ICrypto;
  xpub: string;
  GAP: number = 20;
  syncing: { [string]: boolean } = {};
  // need to be bigger than the number of tx from the same address that can be in the same block
  txsSyncArraySize: number = 1000;

  constructor({ storage, explorer, crypto, xpub }) {
    super();
    this.storage = storage;
    this.explorer = explorer;
    this.crypto = crypto;
    this.xpub = xpub;
  }

  async syncAddress(derivationMode: string, account: number, index: number) {
    const address = this.crypto.getAddress(
      derivationMode,
      this.xpub,
      account,
      index
    );

    await this._whenSynced("address", address);

    const data = {
      type: "address",
      key: address,
      derivationMode,
      account,
      index,
      address,
    };

    this.emitSyncing(data);

    // TODO handle eventual reorg case using lastBlock

    let added = 0;
    let total = 0;
    while (
      (added = await this.fetchHydrateAndStoreNewTxs(
        address,
        derivationMode,
        account,
        index
      ))
    ) {
      total += added;
    }

    this.emitSynced({ ...data, total });

    const lastTx = await this.storage.getLastTx({
      derivationMode,
      account,
      index,
    });

    return !!lastTx;
  }

  async checkAddressesBlock(
    derivationMode: string,
    account: number,
    index: number
  ) {
    let addressesResults = await Promise.all(
      range(this.GAP).map((_, key) =>
        this.syncAddress(derivationMode, account, index + key)
      )
    );
    return some(addressesResults, (lastTx) => !!lastTx);
  }

  async syncAccount(derivationMode: string, account: number) {
    await this._whenSynced("account", `${derivationMode}-${account}`);

    this.emitSyncing({
      type: "account",
      key: `${derivationMode}-${account}`,
      derivationMode,
      account,
    });

    let index = 0;

    while (await this.checkAddressesBlock(derivationMode, account, index)) {
      index += this.GAP;
    }

    this.emitSynced({
      type: "account",
      key: `${derivationMode}-${account}`,
      derivationMode,
      account,
      index,
    });

    return index;
  }

  async syncDerivationMode(derivationMode: string) {
    await this._whenSynced("derivationMode", derivationMode);

    this.emitSyncing({
      type: "derivationMode",
      key: derivationMode,
      derivationMode,
    });

    let account = 0;

    while (await this.syncAccount(derivationMode, account)) {
      account++;
    }

    this.emitSynced({
      type: "derivationMode",
      key: derivationMode,
      derivationMode,
      account,
    });

    return account;
  }

  // TODO : test fail case + incremental
  async sync() {
    await this._whenSynced("all");

    this.emitSyncing({ type: "all" });

    // explore derivation modes in parallel
    await Promise.all(
      Object.values(this.crypto.DerivationMode).map((derivationMode) =>
        this.syncDerivationMode(derivationMode)
      )
    );

    this.emitSynced({ type: "all" });
  }

  async getDerivationModeAccounts(derivationMode: string) {
    await this._whenSynced("derivationMode", derivationMode);
    return this.storage.getDerivationModeUniqueAccounts(derivationMode);
  }

  async getWalletBalance() {
    await this._whenSynced("all");

    const addresses = await this.getWalletAddresses();

    return this.getAddressesBalance(addresses);
  }

  async getDerivationModeBalance(derivationMode: string) {
    await this._whenSynced("derivationMode", derivationMode);

    const addresses = await this.getDerivationModeAddresses(derivationMode);

    return this.getAddressesBalance(addresses);
  }

  async getAccountBalance(derivationMode: string, account: number) {
    await this._whenSynced("account", `${derivationMode}-${account}`);

    const addresses = await this.getAccountAddresses(derivationMode, account);

    return this.getAddressesBalance(addresses);
  }

  async getAddressBalance(address: Address) {
    await this._whenSynced("address", address.address);

    const unspentUtxos = await this.storage.getAddressUnspentUtxos(address);

    return unspentUtxos.reduce((total, { value }) => total + value, 0);
  }

  async getWalletAddresses() {
    await this._whenSynced("all");
    return this.storage.getUniquesAddresses({});
  }

  async getDerivationModeAddresses(derivationMode: string) {
    await this._whenSynced("derivationMode", derivationMode);
    return this.storage.getUniquesAddresses({ derivationMode });
  }

  async getAccountAddresses(derivationMode: string, account: number) {
    await this._whenSynced("account", `${derivationMode}-${account}`);
    return this.storage.getUniquesAddresses({ derivationMode, account });
  }

  async buildTx(
    from: { derivationMode: string; account: number },
    change:
      | string
      | { derivationMode: string; account: number; randomGapToUse?: number },
    destAddress: string,
    amount: number,
    fee: number
  ) {
    const synced = [
      this._whenSynced("account", `${from.derivationMode}-${from.account}`),
    ];
    if (typeof change !== "string") {
      synced.push(
        this._whenSynced(
          "account",
          `${change.derivationMode}-${change.account}`
        )
      );
    }
    await Promise.all(synced);

    const psbt = this.crypto.getPsbt();

    // get the utxos to use as input
    // from all addresses of the account
    const addresses = await this.getAccountAddresses(
      from.derivationMode,
      from.account
    );
    let unspentUtxos = flatten(
      await Promise.all(
        addresses.map((address) => this.storage.getAddressUnspentUtxos(address))
      )
    );
    unspentUtxos = sortBy(unspentUtxos, "value");

    // now we select only the output needed to cover the amount + fee
    let total = 0;
    let i = 0;
    const unspentUtxoSelected: Output[] = [];
    while (total < amount + fee) {
      total += unspentUtxos[i].value;
      unspentUtxoSelected.push(unspentUtxos[i]);
      i += 1;
    }

    // calculate change address
    let changeAddress: string;
    if (typeof change === "string") {
      changeAddress = change;
    } else {
      changeAddress = await this.getNewAccountChangeAddress(
        change.derivationMode,
        change.account,
        change.randomGapToUse || random(this.GAP)
      );
    }

    unspentUtxoSelected.forEach((output) => {
      //
      psbt.addInput({
        hash: output.output_hash,
        index: output.output_index,
        // address: output.address, // TODO : if we can not pass address, can we
        // really use utxo from the whole account ?
      });

      // Todo add the segwit / redeem / witness stuff
    });

    psbt
      .addOutput({
        address: destAddress,
        value: amount,
      })
      .addOutput({
        address: changeAddress,
        value: total - amount - fee,
      });

    return psbt.toBase64();
  }

  // internal
  async getAddressesBalance(addresses: Address[]) {
    const balances = await Promise.all(
      addresses.map((address) => this.getAddressBalance(address))
    );

    return balances.reduce(
      (total, balance) => (total || 0) + (balance || 0),
      0
    );
  }
  // TODO : test the different syncing protection logic
  emitSyncing(data: any) {
    this.syncing[`${data.type}-${data.key}`] = true;
    this.emit("syncing", data);
  }
  emitSynced(data: any) {
    this.syncing[`${data.type}-${data.key}`] = false;
    this.emit("synced", data);
  }
  _whenSynced(type: string, key?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.syncing[`${type}-${key}`]) {
        return resolve();
      }
      const handler = (evt) => {
        if (evt.type === type && evt.key === key) {
          this.off("synced", handler);
          resolve();
        }
      };
      this.on("synced", handler);
    });
  }
  async fetchHydrateAndStoreNewTxs(
    address: string,
    derivationMode: string,
    account: number,
    index: number
  ) {
    const lastTx = await this.storage.getLastTx({
      derivationMode,
      account,
      index,
    });

    let txs = await this.explorer.getAddressTxsSinceLastTxBlock(
      this.txsSyncArraySize,
      { address, derivationMode, account, index },
      lastTx
    );
    const inserted = await this.storage.appendTxs(txs);
    return inserted;
  }
  async getNewAccountChangeAddress(
    derivationMode: string,
    account: number,
    randomGapToUse: number
  ) {
    await this._whenSynced("account", `${derivationMode}-${account}`);

    const accountAddresses = await this.getAccountAddresses(
      derivationMode,
      account
    );
    const lastIndex = (maxBy(accountAddresses, "index") || { index: -1 }).index;
    let index: number;
    if (lastIndex === -1) {
      index = 0;
    } else {
      index = lastIndex + randomGapToUse;
    }
    return this.crypto.getAddress(derivationMode, this.xpub, account, index);
  }
}

export default Wallet;
