import { maxBy, range, some } from "lodash";
import BigNumber from "bignumber.js";
import { Address, IStorage } from "./storage/types";
import EventEmitter from "./utils/eventemitter";
import { IExplorer } from "./explorer/types";
import { ICrypto } from "./crypto/types";
import { PickingStrategy } from "./pickingstrategies/types";
import * as utils from "./utils";
import { TransactionInfo, InputInfo, OutputInfo } from "./types";

// names inside this class and discovery logic respect BIP32 standard
class Xpub extends EventEmitter {
  storage: IStorage;

  explorer: IExplorer;

  crypto: ICrypto;

  xpub: string;

  derivationMode: string;

  // https://github.com/bitcoinjs/bitcoinjs-lib/blob/27a840aac4a12338f1e40c54f3759bbd7a559944/src/bufferutils.js#L24
  // only works with number so we need to be sure to pass correct numbers
  OUTPUT_VALUE_MAX: number = Number.MAX_SAFE_INTEGER;

  GAP = 20;

  syncing: { [key: string]: boolean } = {};

  // need to be bigger than the number of tx from the same address that can be in the same block
  txsSyncArraySize = 1000;

  constructor({
    storage,
    explorer,
    crypto,
    xpub,
    derivationMode,
  }: {
    storage: IStorage;
    explorer: IExplorer;
    crypto: ICrypto;
    xpub: string;
    derivationMode: string;
  }) {
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

    await this.whenSynced("address", address);

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
      // TODO perf: bad : looping in the tx array
      await this.checkAddressReorg(account, index);

      // in case pendings have changed we clean them out
      // TODO perf : bad : looping in the tx array
      const hasPendings = !!(await this.storage.getLastTx({
        confirmed: false,
        account,
        index,
      }));
      if (hasPendings) {
        await this.storage.removePendingTxs({ account, index });
      }

      // eslint-disable-next-line no-cond-assign,no-await-in-loop
      while (
        (added = await this.fetchHydrateAndStoreNewTxs(address, account, index))
      ) {
        total += added;
      }

      const pendingTxs = await this.explorer.getPendings({
        address,
        account,
        index,
      });
      await this.storage.appendTxs(pendingTxs);
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
    const addressesResults = await Promise.all(
      range(this.GAP).map((_, key) => this.syncAddress(account, index + key))
    );
    return some(addressesResults, (lastTx) => !!lastTx);
  }

  async syncAccount(account: number) {
    await this.whenSynced("account", account.toString());

    this.emitSyncing({
      type: "account",
      key: account,
      account,
    });

    let index = 0;

    try {
      // eslint-disable-next-line no-await-in-loop
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
    await this.whenSynced("all");

    this.emitSyncing({ type: "all" });

    let account = 0;

    try {
      // eslint-disable-next-line no-await-in-loop
      while (await this.syncAccount(account)) {
        account += 1;
      }
    } catch (e) {
      this.emitSyncedFailed({ type: "all" });
      throw e;
    }

    this.emitSynced({ type: "all", account });

    return account;
  }

  async getXpubBalance() {
    await this.whenSynced("all");

    const addresses = await this.getXpubAddresses();

    return this.getAddressesBalance(addresses);
  }

  async getAccountBalance(account: number) {
    await this.whenSynced("account", account.toString());

    const addresses = await this.getAccountAddresses(account);

    return this.getAddressesBalance(addresses);
  }

  async getAddressBalance(address: Address) {
    await this.whenSynced("address", address.address);

    const unspentUtxos = await this.storage.getAddressUnspentUtxos(address);

    return unspentUtxos.reduce(
      (total, { value }) => total.plus(value),
      new BigNumber(0)
    );
  }

  async getXpubAddresses() {
    await this.whenSynced("all");
    return this.storage.getUniquesAddresses({});
  }

  async getAccountAddresses(account: number) {
    await this.whenSynced("account", account.toString());
    return this.storage.getUniquesAddresses({ account });
  }

  async getNewAddress(account: number, gap: number) {
    await this.whenSynced("account", account.toString());

    const accountAddresses = await this.getAccountAddresses(account);
    const lastIndex = (maxBy(accountAddresses, "index") || { index: -1 }).index;
    let index: number;
    if (lastIndex === -1) {
      index = 0;
    } else {
      index = lastIndex + gap;
    }
    const address: Address = {
      address: this.crypto.getAddress(
        this.derivationMode,
        this.xpub,
        account,
        index
      ),
      account,
      index,
    };
    return address;
  }

  async buildTx(params: {
    destAddress: string;
    amount: BigNumber;
    feePerByte: number;
    changeAddress: Address;
    utxoPickingStrategy: PickingStrategy;
    sequence?: number;
  }): Promise<TransactionInfo> {
    await this.whenSynced("all");

    const outputs: OutputInfo[] = [];

    // outputs splitting
    // btc only support value fitting in uint64 and the lib
    // we use to serialize output only take js number in params
    // that are actually even more restricted
    const desiredOutputLeftToFit = {
      script: this.crypto.toOutputScript(params.destAddress),
      value: params.amount,
      address: params.destAddress,
      isChange: false,
    };
    while (desiredOutputLeftToFit.value.gt(this.OUTPUT_VALUE_MAX)) {
      outputs.push({
        script: desiredOutputLeftToFit.script,
        value: new BigNumber(this.OUTPUT_VALUE_MAX),
        address: params.destAddress,
        isChange: false,
      });
      desiredOutputLeftToFit.value = desiredOutputLeftToFit.value.minus(
        this.OUTPUT_VALUE_MAX
      );
    }

    if (desiredOutputLeftToFit.value.gt(0)) {
      outputs.push(desiredOutputLeftToFit);
    }

    // now we select only the output needed to cover the amount + fee
    const {
      totalValue: total,
      unspentUtxos: unspentUtxoSelected,
      fee,
      needChangeoutput,
    } = await params.utxoPickingStrategy.selectUnspentUtxosToUse(
      this,
      params.amount,
      params.feePerByte,
      outputs.length
    );

    const txHexs = await Promise.all(
      unspentUtxoSelected.map((unspentUtxo) =>
        this.explorer.getTxHex(unspentUtxo.output_hash)
      )
    );
    const txs = await Promise.all(
      unspentUtxoSelected.map((unspentUtxo) =>
        this.storage.getTx(unspentUtxo.address, unspentUtxo.output_hash)
      )
    );

    const inputs: InputInfo[] = unspentUtxoSelected.map((utxo, index) => {
      return {
        txHex: txHexs[index],
        value: utxo.value,
        address: utxo.address,
        output_hash: utxo.output_hash,
        output_index: utxo.output_index,
        sequence:
          params.sequence && Number.isInteger(params.sequence)
            ? params.sequence
            : null,
      };
    });
    const associatedDerivations: [number, number][] = unspentUtxoSelected.map(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (utxo, index) => [txs[index].account, txs[index].index]
    );

    const txSize = utils.estimateTxSize(
      unspentUtxoSelected.length,
      outputs.length + 1,
      this.crypto,
      this.derivationMode
    );
    const dustAmount = utils.computeDustAmount(this.crypto, txSize);
    // Abandon the change output if change output amount is less than dust amount
    if (
      needChangeoutput &&
      total.minus(params.amount).minus(fee) > dustAmount
    ) {
      outputs.push({
        script: this.crypto.toOutputScript(params.changeAddress.address),
        value: total.minus(params.amount).minus(fee),
        address: params.changeAddress.address,
        isChange: true,
      });
    }

    const outputsValue: BigNumber = outputs.reduce(
      (cur, o) => cur.plus(o.value),
      new BigNumber(0)
    );

    return {
      inputs,
      associatedDerivations,
      outputs,
      fee: total.minus(outputsValue).toNumber(),
      changeAddress: params.changeAddress,
    };
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
      (total, balance) => total.plus(balance),
      new BigNumber(0)
    );
  }

  // TODO : test the different syncing protection logic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitSyncing(data: any) {
    this.syncing[`${data.type}-${data.key}`] = true;
    this.emit("syncing", data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitSynced(data: any) {
    this.syncing[`${data.type}-${data.key}`] = false;
    this.emit("synced", data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitSyncedFailed(data: any) {
    this.syncing[`${data.type}-${data.key}`] = false;
    this.emit("syncfail", data);
  }

  whenSynced(type: string, key?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.syncing[`${type}-${key}`]) {
        resolve();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handler = (evt: any) => {
          if (evt.type === type && evt.key === key) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.off("synced", handler);
            resolve();
          }
        };
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.on("synced", handler);
      }
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
      confirmed: true,
    });

    const txs = await this.explorer.getAddressTxsSinceLastTxBlock(
      this.txsSyncArraySize,
      { address, account, index },
      lastTx
    );
    const inserted = await this.storage.appendTxs(txs);
    return inserted;
  }

  async checkAddressReorg(account: number, index: number) {
    const lastTx = await this.storage.getLastTx({
      account,
      index,
      confirmed: true,
    });

    if (!lastTx) {
      return;
    }

    const block = await this.explorer.getBlockByHeight(lastTx.block.height);

    // all good the block is valid
    if (block && block.hash === lastTx.block.hash) {
      return;
    }

    // in this case the block is not valid so we delete everything
    // for that address
    // TODO: delete only everything for this (address, block)
    // but need to think if its possible with current storage implem

    await this.storage.removeTxs({
      account,
      index,
    });
  }
}

export default Xpub;
