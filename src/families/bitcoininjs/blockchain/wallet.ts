import { Address, IStorage } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { range, findLastIndex } from "lodash";
import { IExplorer } from "./explorer/types";
import { IDerivation } from "./derivation/types";
import { IWallet } from "./types";

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
        // TODO : is balance calc that simple ?
        // TODO : need to remove the fees in which case ??
        const positif = tx.outputs
          .filter((output) => output.address === address)
          .reduce((total, output) => total + output.value, 0);
        const negatif = tx.inputs
          .filter((input) => input.address === address)
          .reduce((total, input) => total + input.value, 0);
        lastBalance = lastBalance + positif - negatif;
        // could be already returned by the explorer
        tx.balance = lastBalance;

        // TODO : maintain on the fly an array of UTXO that are unspent and ready for use
        // when creating a transaction
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

  async syncAccount(derivationMode: string, account: number) {
    this.emit("account-syncing", { derivationMode, account });

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
}

export default Wallet;
