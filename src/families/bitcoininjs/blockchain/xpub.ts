import { Address, IStorage, Output } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { flatten, maxBy, range, some, sortBy } from "lodash";
import { IExplorer } from "./explorer/types";
import { ICrypto } from "./crypto/types";
import { Psbt, Signer } from "bitcoinjs-lib";

// names inside this class and discovery logic respect BIP32 standard
class Xpub extends EventEmitter {
  storage: IStorage;
  explorer: IExplorer;
  crypto: ICrypto;
  xpub: string;
  derivationMode: string;
  GAP: number = 20;
  syncing: { [string]: boolean } = {};
  // need to be bigger than the number of tx from the same address that can be in the same block
  txsSyncArraySize: number = 1000;

  constructor({ storage, explorer, crypto, xpub, derivationMode }) {
    super();
    this.storage = storage;
    this.explorer = explorer;
    this.crypto = crypto;
    this.xpub = xpub;
    this.derivationMode = derivationMode;
  }

  async syncAddress(account: number, index: number) {
    const address = this.crypto.getAddress(
      this.derivationMode,
      this.xpub,
      account,
      index
    );

    await this._whenSynced("address", address);

    const data = {
      type: "address",
      key: address,
      account,
      index,
      address,
    };

    this.emitSyncing(data);

    // TODO handle eventual reorg case using lastBlock

    let added = 0;
    let total = 0;

    try {
      while (
        (added = await this.fetchHydrateAndStoreNewTxs(address, account, index))
      ) {
        total += added;
      }
    } catch (e) {
      this.emitSyncedFailed(data);
      throw e;
    }

    this.emitSynced({ ...data, total });

    const lastTx = await this.storage.getLastTx({
      account,
      index,
    });

    return !!lastTx;
  }

  async checkAddressesBlock(account: number, index: number) {
    let addressesResults = await Promise.all(
      range(this.GAP).map((_, key) => this.syncAddress(account, index + key))
    );
    return some(addressesResults, (lastTx) => !!lastTx);
  }

  async syncAccount(account: number) {
    await this._whenSynced("account", account.toString());

    this.emitSyncing({
      type: "account",
      key: account,
      account,
    });

    let index = 0;

    try {
      while (await this.checkAddressesBlock(account, index)) {
        index += this.GAP;
      }
    } catch (e) {
      this.emitSyncedFailed({
        type: "account",
        key: account,
        account,
      });
      throw e;
    }

    this.emitSynced({
      type: "account",
      key: account,
      account,
      index,
    });

    return index;
  }

  // TODO : test fail case + incremental
  async sync() {
    await this._whenSynced("all");

    this.emitSyncing({ type: "all" });

    let account = 0;

    try {
      while (await this.syncAccount(account)) {
        account++;
      }
    } catch (e) {
      this.emitSyncedFailed({ type: "all" });
      throw e;
    }

    this.emitSynced({ type: "all", account });

    return account;
  }

  async getXpubBalance() {
    await this._whenSynced("all");

    const addresses = await this.getXpubAddresses();

    return this.getAddressesBalance(addresses);
  }

  async getAccountBalance(account: number) {
    await this._whenSynced("account", account.toString());

    const addresses = await this.getAccountAddresses(account);

    return this.getAddressesBalance(addresses);
  }

  async getAddressBalance(address: Address) {
    await this._whenSynced("address", address.address);

    const unspentUtxos = await this.storage.getAddressUnspentUtxos(address);

    return unspentUtxos.reduce((total, { value }) => total + value, 0);
  }

  async getXpubAddresses() {
    await this._whenSynced("all");
    return this.storage.getUniquesAddresses({});
  }

  async getAccountAddresses(account: number) {
    await this._whenSynced("account", account.toString());
    return this.storage.getUniquesAddresses({ account });
  }

  async getNewAddress(account: number, gap: number) {
    await this._whenSynced("account", account.toString());

    const accountAddresses = await this.getAccountAddresses(account);
    const lastIndex = (maxBy(accountAddresses, "index") || { index: -1 }).index;
    let index: number;
    if (lastIndex === -1) {
      index = 0;
    } else {
      index = lastIndex + gap;
    }
    return this.crypto.getAddress(
      this.derivationMode,
      this.xpub,
      account,
      index
    );
  }

  async buildTx(
    from: { account: number },
    change: { account: number; gap: number },
    destAddress: string,
    amount: number,
    fee: number
  ) {
    if (this.derivationMode !== "Legacy") {
      throw "not supported yet";
    }

    await Promise.all([
      this._whenSynced("account", from.account.toString()),
      this._whenSynced("account", change.account.toString()),
    ]);

    const psbt = this.crypto.getPsbt();

    // get the utxos to use as input
    // from all addresses of the account
    const addresses = await this.getXpubAddresses();
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

    const txHexs = await Promise.all(
      unspentUtxoSelected.map((unspentUtxo) =>
        this.explorer.getTxHex(unspentUtxo.output_hash)
      )
    );

    // calculate change address
    const changeAddress = await this.getNewAddress(change.account, change.gap);

    const inputsAddresses: Address[] = [];

    unspentUtxoSelected.forEach((output, i) => {
      //

      const nonWitnessUtxo = Buffer.from(txHexs[i], "hex");
      // for segwit inputs, you only need the output script and value as an object.
      const witnessUtxo = {
        value: output.value,
        script: Buffer.from(output.script_hex, "hex"),
      };
      const mixin =
        this.derivationMode !== "Legacy" ? { witnessUtxo } : { nonWitnessUtxo };

      psbt.addInput({
        hash: output.output_hash,
        index: output.output_index,

        ...mixin,
      });

      const outputAddress = addresses.find(
        (address) => address.address === output.address
      ) || { account: 0, index: 0, address: output.address };

      inputsAddresses.push(outputAddress);
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

    return { psbt, inputsAddresses };
  }

  async broadcastTx(rawTxHex: string) {
    return this.explorer.broadcast(rawTxHex);
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
  emitSyncedFailed(data: any) {
    this.syncing[`${data.type}-${data.key}`] = false;
    this.emit("syncfail", data);
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
    account: number,
    index: number
  ) {
    const lastTx = await this.storage.getLastTx({
      account,
      index,
    });

    let txs = await this.explorer.getAddressTxsSinceLastTxBlock(
      this.txsSyncArraySize,
      { address, account, index },
      lastTx
    );
    const inserted = await this.storage.appendTxs(txs);
    return inserted;
  }
}

export default Xpub;
