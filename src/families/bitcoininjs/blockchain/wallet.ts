import { Address, TX, IStorage, Output } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { maxBy, random, range, some, sortBy, takeWhile } from "lodash";
import { IExplorer } from "./explorer/types";
import { ICrypto } from "./crypto/types";
import { IWallet } from "./types";

class Wallet extends EventEmitter implements IWallet {
  storage: IStorage;
  explorer: IExplorer;
  crypto: ICrypto;
  xpub: string;
  GAP: number = 20;
  syncing: boolean = false;
  // need to be bigger than the number of tx from the same address that can be in the same block
  txsSyncArraySize: number = 1000;

  constructor({ storage, explorer, crypto, xpub }) {
    super();
    this.storage = storage;
    this.explorer = explorer;
    this.crypto = crypto;
    this.xpub = xpub;
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
      address,
      lastTx
    );
    // mutate to hydrate faster
    txs.forEach((tx) => {
      // no need to keep that as it changes
      delete tx.confirmations;

      tx.derivationMode = derivationMode;
      tx.account = account;
      tx.index = index;
      tx.address = address;

      tx.outputs.forEach((output) => {
        if (output.address === address) {
          output.output_hash = tx.id;
        }
      });
    });
    const inserted = await this.storage.appendTxs(txs);
    return inserted;
  }

  async syncAddress(derivationMode: string, account: number, index: number) {
    const address = this.crypto.getAddress(
      derivationMode,
      this.xpub,
      account,
      index
    );
    const data = { derivationMode, account, index, address };

    this.emit("address-syncing", data);

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

    this.emit("address-synced", { ...data, total });

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
    this.emit("account-syncing", { derivationMode, account });

    let index = 0;

    while (await this.checkAddressesBlock(derivationMode, account, index)) {
      index += this.GAP;
    }

    this.emit("account-synced", { derivationMode, account, index });

    return index;
  }

  async syncDerivationMode(derivationMode: string) {
    this.emit("derivationMode-syncing", { derivationMode });

    let account = 0;

    while (await this.syncAccount(derivationMode, account)) {
      account++;
    }

    this.emit("derivationMode-synced", { derivationMode, account });

    return account;
  }

  // TODO : test fail case + incremental
  async sync() {
    if (this.syncing) {
      return this._whenSynced();
    }

    this.syncing = true;

    this.emit("syncing");

    // explore derivation modes in parallel
    await Promise.all(
      Object.values(this.crypto.DerivationMode).map((derivationMode) =>
        this.syncDerivationMode(derivationMode)
      )
    );

    this.syncing = false;

    this.emit("synced");
  }

  _whenSynced(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.syncing) {
        return resolve();
      }

      this.once("synced", resolve);
    });
  }

  async getDerivationModeAccounts(derivationMode: string) {
    await this._whenSynced();
    return this.storage.getDerivationModeUniqueAccounts(derivationMode);
  }

  async getWalletBalance() {
    await this._whenSynced();

    const addresses = await this.getWalletAddresses();

    return this.getAddressesBalance(addresses);
  }

  async getDerivationModeBalance(derivationMode: string) {
    await this._whenSynced();

    const addresses = await this.getDerivationModeAddresses(derivationMode);

    return this.getAddressesBalance(addresses);
  }

  async getAccountBalance(derivationMode: string, account: number) {
    await this._whenSynced();

    const addresses = await this.getAccountAddresses(derivationMode, account);

    return this.getAddressesBalance(addresses);
  }

  async getAddressesBalance(addresses: Address[]) {
    const balances = await Promise.all(
      addresses.map((address) => this.getAddressBalance(address))
    );

    return balances.reduce(
      (total, balance) => (total || 0) + (balance || 0),
      0
    );
  }

  async getAddressBalance(address: Address) {
    await this._whenSynced();

    // TODO SHOULD actually use getAddressLastBlockState
    const { unspentUtxos, spentUtxos } = await this.storage.getAddressUtxos(
      address
    );

    return (
      unspentUtxos.reduce((total, { value }) => total + value, 0) -
      spentUtxos.reduce((total, { value }) => total + value, 0)
    );
  }

  async getWalletAddresses() {
    await this._whenSynced();
    return this.storage.getUniquesAddresses({});
  }

  async getDerivationModeAddresses(derivationMode: string) {
    await this._whenSynced();
    return this.storage.getUniquesAddresses({ derivationMode });
  }

  async getAccountAddresses(derivationMode: string, account: number) {
    await this._whenSynced();
    return this.storage.getUniquesAddresses({ derivationMode, account });
  }

  async getNewAccountChangeAddress(
    derivationMode: string,
    account: number,
    randomGapToUse: number
  ) {
    await this._whenSynced();

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

  async buildTx(
    from: { derivationMode: string; account: number },
    change:
      | string
      | { derivationMode: string; account: number; randomGapToUse?: number },
    destAddress: string,
    amount: number,
    fee: number
  ) {
    await this._whenSynced();

    const psbt = this.crypto.getPsbt();

    // get the utxos to use as input
    // from all addresses of the account
    const addresses = await this.getAccountAddresses(
      from.derivationMode,
      from.account
    );
    const utxos = await Promise.all(
      addresses.map((address) => this.storage.getAddressUtxos(address))
    );

    let unspentUtxos = utxos.reduce(
      (unspentUtxosAcc: Output[], { unspentUtxos }) =>
        unspentUtxosAcc.concat(unspentUtxos),
      []
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
        address: output.address,
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
}

export default Wallet;
