import { IStorage } from "./storage/types";
import events from "events";
import * as derivation from "./derivation";
import { IExplorer } from "./explorer/types";

declare interface IClient {
  on(event: "address-syncing", listener: () => void): this;
  on(event: "address-synced", listener: () => void): this;
  on(event: "account-syncing", listener: () => void): this;
  on(event: "account-synced", listener: () => void): this;
  on(event: "derivationMode-syncing", listener: () => void): this;
  on(event: "derivationMode-synced", listener: () => void): this;
  on(event: "syncing", listener: () => void): this;
  on(event: "synced", listener: () => void): this;
}

class Client extends events.EventEmitter implements IClient {
  storage: IStorage;
  explorer: IExplorer;
  xpub: string;
  network: string;
  GAP: number = 20;
  syncing: boolean = false;

  constructor({ storage, explorer, xpub, network }) {
    super();
    this.storage = storage;
    this.explorer = explorer;
    this.xpub = xpub;
    this.network = network;
  }

  // sync address and store data
  async syncAddress(derivationMode: string, account: number, index: number) {
    const address = derivation.getAddress(
      derivationMode,
      this.xpub,
      account,
      index,
      this.network
    );
    const data = { derivationMode, account, index, address };

    this.emit("address-syncing", data);

    // can be undefined
    let lastBlock = await this.storage.getAddressLastBlock(
      derivationMode,
      account,
      index,
      address
    );

    // TODO handle eventual reorg case using lastBlock

    let txs = await this.explorer.getAddressTransactionsSinceBlock(
      address,
      lastBlock
    );

    await this.storage.appendAddressTxs(
      derivationMode,
      account,
      index,
      address,
      txs
    );

    this.emit("address-synced", data);

    const addressLastBlock = await this.storage.getAddressLastBlock(
      derivationMode,
      account,
      index,
      address
    );
    return addressLastBlock;
  }

  // sync account
  async syncAccount(derivationMode: string, account: number) {
    this.emit("account-syncing", { derivationMode, account });

    // can be undefined
    let index =
      (await this.storage.getAccountLastIndex(derivationMode, account)) || 0;

    const checkAddressesBlock = async (index) => {
      let addressesResults = await Promise.all(
        new Array(this.GAP).map((_, key) =>
          this.syncAddress(derivationMode, account, index + key)
        )
      );
      return addressesResults.filter((lastBlockHash) => !!lastBlockHash).length;
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
      Object.values(derivation.DerivationMode).map((derivationMode) =>
        this.syncDerivationMode(derivationMode)
      )
    );

    this.syncing = false;

    this.emit("synced");
  }

  _whenSynced() {
    return new Promise<void>((resolve) => {
      if (!this.syncing) {
        return resolve();
      }

      this.once("synced", resolve);
    });
  }

  // TODO handle returning the Wallet balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  getWalletBalance() {}

  // TODO handle returning the derivation mode balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  getDerivationModeBalance(derivationMode: string) {}

  // TODO handle returning the account balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  getAccountBalance(derivationMode: string, account: number) {}

  // TODO handle returning the address balance from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  getAddressBalance(derivationMode: string, account: number, index: number) {}

  // TODO fetch address details from storage
  // wait for sync to finish if sync is ongoing
  getAddressDetailsFromAddress(address: string) {
    /*
    return {
      derivationMode: "",
      account: 0,
      index: 0,
    };
    */
  }

  // handle returning the next account available from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  getNextAccount(derivationMode: string) {
    // { derivationMode, account }
  }

  // handle building a tx from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  buildTx() {}

  // handle broadcasting a tx, inserting the pending transaction in the storage
  broadcastTx() {
    // just to trigger a sync so that listeners get to update their state with the new pending transaction
    this.sync();
  }
}

export type { IClient };
export default Client;
