import { Address, IStorage } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { range, findLastIndex, add } from "lodash";
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
      let lastBalance = (
        (await this.storage.getLastTx({
          derivationMode,
          account,
          index,
        })) || { balance: 0 }
      ).balance;
      txs.forEach((tx) => {
        tx.derivationMode = derivationMode;
        tx.account = account;
        tx.index = index;
        tx.address = address;
        // we calculate it from storage instead of having to update continually
        // as new block are mined
        delete tx.confirmations;

        // we calculate the balance based on last balance
        const positif = tx.outputs
          .filter((output) => output.address === address)
          .reduce((total, output) => total + output.value, 0);
        const negatif = tx.inputs
          .filter((input) => input.address === address)
          .reduce((total, input) => total + input.value, 0);
        lastBalance = lastBalance + positif - negatif;
        // could be already returned by the explorer
        tx.balance = lastBalance;
      });
      await this.storage.appendAddressTxs(txs);
      return txs.length;
    };

    let lastBlock = (
      (await this.storage.getLastTx({
        derivationMode,
        account,
        index,
      })) || {}
    ).block;

    while (await fetchHydrateAndStore(lastBlock)) {
      lastBlock = (
        (await this.storage.getLastTx({
          derivationMode,
          account,
          index,
        })) || {}
      ).block;
    }

    this.emit("address-synced", { ...data, lastBlock });

    return lastBlock;
  }

  // sync account
  async syncAccount(derivationMode: string, account: number) {
    this.emit("account-syncing", { derivationMode, account });

    // can be undefined
    let index = (
      (await this.storage.getLastTx({
        derivationMode,
        account,
      })) || { index: 0 }
    ).index;

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
  // handle returning the Wallet balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getWalletBalance() {
    await this._whenSynced();

    const addresses = await this.getWalletAddresses();

    return this.getAddressesBalance(addresses);
  }

  // handle returning the derivation mode balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getDerivationModeBalance(derivationMode: string) {
    await this._whenSynced();

    const addresses = await this.getDerivationModeAddresses(derivationMode);

    return this.getAddressesBalance(addresses);
  }

  // handle returning the account balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
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

  // handle returning the address balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  async getAddressBalance(address: Address) {
    await this._whenSynced();

    // TODO: throw if inavalid address ?
    return (
      (await this.storage.getLastTx({
        derivationMode: address.derivationMode,
        account: address.account,
        index: address.index,
      })) || {
        balance: null,
      }
    ).balance;
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
