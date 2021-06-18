import { Address, TX, IStorage, Input } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { range, some, maxBy, random, find, findIndex } from "lodash";
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
    let lastTx = await this.storage.getLastTx({
      derivationMode,
      account,
      index,
    });
    let txs = await this.explorer.getAddressTxsSinceLastTx(
      this.txsSyncArraySize,
      address,
      lastTx
    );
    // mutate to hydrate faster
    let lastUnspentUtxos: Output[] = (lastTx || { unspentUtxos: [] })
      .unspentUtxos;
    let lastSpentUtxos: Input[] = (lastTx || { spentUtxos: [] }).spentUtxos;
    txs.forEach((rawTx) => {
      // we calculate it from storage instead of having to update continually
      // as new block are mined
      delete rawTx.confirmations;

      const tx: TX = rawTx;
      tx.derivationMode = derivationMode;
      tx.account = account;
      tx.index = index;
      tx.address = address;

      // we update unspentUtxos
      const newUnspentUtxos = tx.outputs.filter(
        (output) => output.address === address
      );
      lastUnspentUtxos = lastUnspentUtxos.concat(newUnspentUtxos);
      newUnspentUtxos.forEach((output) => {
        output.output_hash = tx.id;
      });
      const newSpentUtxos = tx.inputs.filter(
        (input) => input.address === address
      );
      lastSpentUtxos = lastSpentUtxos.concat(newSpentUtxos);

      lastUnspentUtxos = lastUnspentUtxos.filter((output) => {
        const matchIndex = findIndex(
          lastSpentUtxos,
          (input) =>
            input.output_hash === output.output_hash &&
            input.output_index === output.output_index
        );
        if (matchIndex > -1) {
          lastSpentUtxos.splice(matchIndex, 1);
          return false;
        }
        return true;
      });

      // could actually be already returned by the explorer
      tx.unspentUtxos = lastUnspentUtxos;
      tx.spentUtxos = lastSpentUtxos;
    });
    await this.storage.appendAddressTxs(txs);
    return txs.length;
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

    return total;
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
    return some(addressesResults, (totalAdded) => totalAdded > 0);
  }

  async syncAccount(derivationMode: string, account: number) {
    this.emit("account-syncing", { derivationMode, account });

    let index = (
      (await this.storage.getLastTx({
        derivationMode,
        account,
      })) || { index: 0 }
    ).index;

    while (await this.checkAddressesBlock(derivationMode, account, index)) {
      index += this.GAP;
    }

    this.emit("account-synced", { derivationMode, account, index });

    return index;
  }

  async syncDerivationMode(derivationMode: string) {
    this.emit("derivationMode-syncing", { derivationMode });

    let account = (
      (await this.storage.getLastTx({
        derivationMode,
      })) || { account: 0 }
    ).account;

    while (await this.syncAccount(derivationMode, account)) {
      account++;
    }

    this.emit("derivationMode-synced", { derivationMode, account });

    return account;
  }

  // TODO handle fail case
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

    // TODO: throw if inavalid address ?
    const unspentUtxos = (
      (await this.storage.getLastTx({
        derivationMode: address.derivationMode,
        account: address.account,
        index: address.index,
      })) || {}
    ).unspentUtxos;

    return unspentUtxos?.reduce((total, { value }) => total + value, 0);
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

  /*
  async getNewAccountChangeAddress(derivationMode: string, account: number) {
    const accountAddresses = await this.getAccountAddresses(
      derivationMode,
      account
    );
    const lastIndex = (maxBy(accountAddresses, "index") || { index: -1 }).index;
    let index: number;
    if (lastIndex === -1) {
      index = 0;
    } else {
      index = lastIndex + random(this.GAP);
    }
    return this.crypto.getAddress(derivationMode, this.xpub, account, index);
  }

  async buildTx(
    from: { derivationMode: string; account: number },
    change: string | { derivationMode: string; account: number },
    destAddress: string,
    amount: number,
    fee: number
  ) {
    const psbt = this.crypto.getPsbt();

    // get the utxos to use as input
    // from all addresses of the account
    const outputs: Output[] = [];

    // calculate
    let changeAddress: string;
    if (typeof change === "string") {
      changeAddress = change;
    } else {
      changeAddress = await this.getNewAccountChangeAddress(
        change.derivationMode,
        change.account
      );
    }

    let totalOutputsValue = 0;

    outputs.forEach((output) => {
      totalOutputsValue += output.value;

      //
      psbt.addInput({
        hash: output.output_hash,
        index: output.output_index,
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
        value: totalOutputsValue - amount - fee,
      });

    return psbt.toBase64();
  }
  */
}

export default Wallet;
