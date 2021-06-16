import { IStorage } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { range, findLastIndex } from "lodash";
import { IExplorer } from "./explorer/types";
import { IDerivation } from "./derivation/types";

declare interface IWallet {
  on(event: "address-syncing", listener: () => void): this;
  on(event: "address-synced", listener: () => void): this;
  on(event: "account-syncing", listener: () => void): this;
  on(event: "account-synced", listener: () => void): this;
  on(event: "derivationMode-syncing", listener: () => void): this;
  on(event: "derivationMode-synced", listener: () => void): this;
  on(event: "syncing", listener: () => void): this;
  on(event: "synced", listener: () => void): this;
}

class Wallet extends EventEmitter implements IWallet {
  storage: IStorage;
  explorer: IExplorer;
  derivation: IDerivation;
  xpub: string;
  GAP: number = 20;
  syncing: boolean = false;
  // need to be bigger than the number of tx from the same address that can be in the same block
  txsSyncArraySize: number = 1000;

  constructor({ storage, explorer, derivation, xpub }) {
    super();
    this.storage = storage;
    this.explorer = explorer;
    this.derivation = derivation;
    this.xpub = xpub;
  }

  // sync address and store data
  async syncAddress(derivationMode: string, account: number, index: number) {
    const address = this.derivation.getAddress(
      derivationMode,
      this.xpub,
      account,
      index
    );
    const data = { derivationMode, account, index, address };

    this.emit("address-syncing", data);

    // TODO handle eventual reorg case using lastBlock

    const fetchHydrateAndStore = async (lastBlock) => {
      let txs = await this.explorer.getNAddressTransactionsSinceBlockExcludingBlock(
        this.txsSyncArraySize,
        address,
        lastBlock
      );
      // mutate to hydrate faster
      txs.forEach((tx) => {
        tx.derivationMode = derivationMode;
        tx.account = account;
        tx.index = index;
        tx.address = address;
        // we calculate it from storage instead of having to update continually
        // as new block are mined
        delete tx.confirmations;
      });
      await this.storage.appendAddressTxs(txs);
      return txs.length;
    };

    // can be undefined
    let lastBlock = await this.storage.getAddressLastBlock(
      derivationMode,
      account,
      index
    );

    while (await fetchHydrateAndStore(lastBlock)) {
      lastBlock = await this.storage.getAddressLastBlock(
        derivationMode,
        account,
        index
      );
    }

    this.emit("address-synced", { ...data, lastBlock });

    return lastBlock;
  }

  // sync account
  async syncAccount(derivationMode: string, account: number) {
    this.emit("account-syncing", { derivationMode, account });

    // can be undefined
    let index =
      (await this.storage.getAccountLastIndex(derivationMode, account)) || 0;

    const checkAddressesBlock = async (index) => {
      let addressesResults = await Promise.all(
        range(this.GAP).map((_, key) =>
          this.syncAddress(derivationMode, account, index + key)
        )
      );
      return (
        findLastIndex(addressesResults, (lastBlockHash) => !!lastBlockHash) + 1
      );
    };

    let nb;
    while ((nb = await checkAddressesBlock(index))) {
      index += nb;
    }

    this.emit("account-synced", { derivationMode, account, index });

    return index;
  }

  // sync derivation mode
  async syncDerivationMode(derivationMode: string) {
    this.emit("derivationMode-syncing", { derivationMode });

    let account =
      // can be undefined
      (await this.storage.getDerivationModeLastAccount(derivationMode)) || 0;

    while (await this.syncAccount(derivationMode, account)) {
      account++;
    }

    this.emit("derivationMode-synced", { derivationMode, account });

    return account;
  }

  // sync everything, from discovery to syncing
  // does incremental update based on what is stored in the db
  // TODO handle fail case
  async sync() {
    if (this.syncing) {
      return this._whenSynced();
    }

    this.syncing = true;

    this.emit("syncing");

    // explore derivation modes in parallel
    await Promise.all(
      Object.values(this.derivation.DerivationMode).map((derivationMode) =>
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

  // handle returning the derivation mode adresses from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getDerivationModeAccounts(derivationMode: string) {
    await this._whenSynced();
    return this.storage.getDerivationModeUniqueAccounts(derivationMode);
  }

  _computeBalance(inputs, outputs) {
    // TODO : is this dumb implem enough really ?
    const positif = outputs.reduce((total, output) => total + output.value, 0);
    const negatif = inputs.reduce((total, output) => total + output.value, 0);
    return positif - negatif;
  }

  // handle returning the Wallet balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getWalletBalance() {
    await this._whenSynced();

    const outputs = await this.storage.getOutputsToInternalWalletAddresses({});
    const inputs = await this.storage.getInputsFromInternalWalletAddresses({});

    return this._computeBalance(inputs, outputs);
  }

  // handle returning the derivation mode balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getDerivationModeBalance(derivationMode: string) {
    await this._whenSynced();

    const outputs = await this.storage.getOutputsToInternalWalletAddresses({
      derivationMode,
    });
    const inputs = await this.storage.getInputsFromInternalWalletAddresses({
      derivationMode,
    });

    return this._computeBalance(inputs, outputs);
  }

  // handle returning the account balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getAccountBalance(derivationMode: string, account: number) {
    await this._whenSynced();

    const outputs = await this.storage.getOutputsToInternalWalletAddresses({
      derivationMode,
      account,
    });
    const inputs = await this.storage.getInputsFromInternalWalletAddresses({
      derivationMode,
      account,
    });

    return this._computeBalance(inputs, outputs);
  }

  // handle returning the address balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getAddressBalance(
    derivationMode: string,
    account: number,
    index: number
  ) {
    await this._whenSynced();

    const outputs = await this.storage.getOutputsToInternalWalletAddresses({
      derivationMode,
      account,
      index,
    });
    const inputs = await this.storage.getInputsFromInternalWalletAddresses({
      derivationMode,
      account,
      index,
    });

    return this._computeBalance(inputs, outputs);
  }

  // TODO fetch address details from storage
  // wait for sync to finish if sync is ongoing
  getAddressDetailsFromAddress(address: string) {
    return this.storage.getAddressDetails(address);
  }

  // handle returning the Wallet addresse from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getWalletAddresses() {
    await this._whenSynced();
    return this.storage.getUniquesAddresses({});
  }

  // handle returning the derivation mode adresses from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getDerivationModeAddresses(derivationMode: string) {
    await this._whenSynced();
    return this.storage.getUniquesAddresses({ derivationMode });
  }

  // handle returning the account addresses from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getAccountAddresses(derivationMode: string, account: number) {
    await this._whenSynced();
    return this.storage.getUniquesAddresses({ derivationMode, account });
  }

  // TODO handle returning the next account available from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  getNextAccount(derivationMode: string) {
    // { derivationMode, account }
  }

  // TODO handle building a tx from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  buildTx() {}

  // TODO handle broadcasting a tx, inserting the pending transaction in storage ?
  broadcastTx() {}
}

export default Wallet;
