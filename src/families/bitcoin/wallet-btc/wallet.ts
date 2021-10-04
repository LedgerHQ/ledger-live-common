import "bitcore-lib";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { flatten } from "lodash";
import BigNumber from "bignumber.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BufferWriter } from "bitcoinjs-lib/src/bufferutils";
import * as bitcoin from "bitcoinjs-lib";

import Btc from "@ledgerhq/hw-app-btc";
import { log } from "@ledgerhq/logs";
import { Transaction } from "@ledgerhq/hw-app-btc/lib/types";
import { Currency } from "./crypto/types";

import { TransactionInfo, DerivationModes } from "./types";
import { Account, SerializedAccount } from "./account";
import Xpub from "./xpub";
import { IExplorer } from "./explorer/types";
import BitcoinLikeExplorer from "./explorer";
import { IStorage } from "./storage/types";
import BitcoinLikeStorage from "./storage";
import { PickingStrategy } from "./pickingstrategies/types";
import * as utils from "./utils";
import cryptoFactory from "./crypto/factory";

class BitcoinLikeWallet {
  explorerInstances: { [key: string]: IExplorer } = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  explorers: { [key: string]: (explorerURI: string) => IExplorer } = {
    ledgerv3: (explorerURI) =>
      new BitcoinLikeExplorer({
        explorerURI,
        explorerVersion: "v3",
      }),
    ledgerv2: (explorerURI) =>
      new BitcoinLikeExplorer({
        explorerURI,
        explorerVersion: "v2",
      }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accountStorages: { [key: string]: (...args: any[]) => IStorage } = {
    mock: () => new BitcoinLikeStorage(),
  };

  getExplorer(explorer: "ledgerv3" | "ledgerv2", explorerURI: string) {
    const id = `explorer-${explorer}-uri-${explorerURI}`;
    this.explorerInstances[id] =
      this.explorerInstances[id] || this.explorers[explorer](explorerURI);
    return this.explorerInstances[id];
  }

  async generateAccount(params: {
    xpub?: string;
    btc?: Btc;
    path: string;
    index: number;
    currency: Currency;
    network: "mainnet" | "testnet";
    derivationMode: DerivationModes;
    explorer: "ledgerv3" | "ledgerv2";
    explorerURI: string;
    storage: "mock";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storageParams: any[];
  }): Promise<Account> {
    const crypto = cryptoFactory(params.currency);

    let { xpub } = params;

    if (!xpub) {
      // Xpub not provided, generate it using the hwapp

      if (!params.btc) {
        // hwapp not provided
        throw new Error("generateAccount need either a hwapp or xpub");
      }

      xpub = await this.generateXpub(
        params.btc,
        params.currency,
        params.path,
        params.index
      );
    }

    if (!xpub) {
      throw new Error("Error while generating the xpub");
    }

    const storage = this.accountStorages[params.storage](
      ...params.storageParams
    );
    const explorer = this.getExplorer(params.explorer, params.explorerURI);
    return {
      params,
      xpub: new Xpub({
        storage,
        explorer,
        crypto,
        xpub,
        derivationMode: params.derivationMode,
      }),
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async exportToSerializedAccount(
    account: Account
  ): Promise<SerializedAccount> {
    const data = await account.xpub.storage.export();

    return {
      ...account,
      xpub: {
        xpub: account.xpub.xpub,
        data,
      },
    };
  }

  async generateXpub(
    btc: Btc,
    currency: Currency,
    path: string,
    index: number
  ): Promise<string> {
    const parentDerivation = await btc.getWalletPublicKey(`${path}`);
    const accountDerivation = await btc.getWalletPublicKey(`${path}/${index}'`);

    // parent
    const publicKeyParentCompressed = utils.compressPublicKey(
      parentDerivation.publicKey
    );
    const publicKeyParentCompressedHex = utils.parseHexString(
      publicKeyParentCompressed
    );
    let result = bitcoin.crypto.sha256(
      Buffer.from(publicKeyParentCompressedHex)
    );
    result = bitcoin.crypto.ripemd160(result);
    // eslint-disable-next-line no-bitwise
    const fingerprint =
      ((result[0] << 24) | (result[1] << 16) | (result[2] << 8) | result[3]) >>>
      0;

    // account
    const publicKeyAccountCompressed = utils.compressPublicKey(
      accountDerivation.publicKey
    );
    // eslint-disable-next-line no-bitwise
    const childnum = (0x80000000 | index) >>> 0;

    const { network } = cryptoFactory(currency);
    const xpubRaw = utils.createXPUB(
      3,
      fingerprint,
      childnum,
      accountDerivation.chainCode,
      publicKeyAccountCompressed,
      network.bip32.public
    );

    return utils.encodeBase58Check(xpubRaw);
  }

  async importFromSerializedAccount(
    account: SerializedAccount
  ): Promise<Account> {
    const crypto = cryptoFactory(account.params.currency);
    const storage = this.accountStorages[account.params.storage](
      ...account.params.storageParams
    );
    const explorer = this.getExplorer(
      account.params.explorer,
      account.params.explorerURI
    );

    const xpub = new Xpub({
      storage,
      explorer,
      crypto,
      xpub: account.xpub.xpub,
      derivationMode: account.params.derivationMode,
    });

    await xpub.storage.load(account.xpub.data);

    return {
      ...account,
      xpub,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async syncAccount(account: Account) {
    return account.xpub.sync();
  }

  // eslint-disable-next-line class-methods-use-this
  async getAccountNewReceiveAddress(account: Account) {
    const address = await account.xpub.getNewAddress(0, 1);
    return address;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAccountNewChangeAddress(account: Account) {
    const address = await account.xpub.getNewAddress(1, 1);
    return address;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAccountTransactions(account: Account) {
    const txs = await account.xpub.storage.export();
    return txs;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAccountUnspentUtxos(account: Account) {
    const addresses = await account.xpub.getXpubAddresses();
    return flatten(
      await Promise.all(
        addresses.map((address) =>
          account.xpub.storage.getAddressUnspentUtxos(address)
        )
      )
    );
  }

  // eslint-disable-next-line class-methods-use-this
  async estimateAccountMaxSpendable(account: Account, feePerByte: number) {
    const addresses = await account.xpub.getXpubAddresses();
    const utxos = flatten(
      await Promise.all(
        addresses.map((address) =>
          account.xpub.storage.getAddressUnspentUtxos(address)
        )
      )
    );
    const balance = await account.xpub.getXpubBalance();
    // fees if we use all utxo
    const fees =
      feePerByte *
      utils.estimateTxSize(
        utxos.length,
        1,
        account.xpub.crypto,
        account.xpub.derivationMode
      );
    const maxSpendable = balance.minus(fees);
    return maxSpendable.lt(0) ? new BigNumber(0) : maxSpendable;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAccountBalance(account: Account) {
    const balance = await account.xpub.getXpubBalance();
    return balance;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAccountPendings(account: Account) {
    const addresses = await account.xpub.getXpubAddresses();
    return flatten(
      await Promise.all(
        addresses.map((address) => account.xpub.explorer.getPendings(address))
      )
    );
  }

  // eslint-disable-next-line class-methods-use-this
  async buildAccountTx(params: {
    fromAccount: Account;
    dest: string;
    amount: BigNumber;
    feePerByte: number;
    utxoPickingStrategy: PickingStrategy;
    sequence?: number;
  }): Promise<TransactionInfo> {
    const changeAddress = await params.fromAccount.xpub.getNewAddress(1, 1);
    const txInfo = await params.fromAccount.xpub.buildTx({
      destAddress: params.dest,
      amount: params.amount,
      feePerByte: params.feePerByte,
      changeAddress,
      utxoPickingStrategy: params.utxoPickingStrategy,
      sequence: params.sequence,
    });
    return txInfo;
  }

  // eslint-disable-next-line class-methods-use-this
  async signAccountTx(params: {
    btc: Btc;
    fromAccount: Account;
    txInfo: TransactionInfo;
    lockTime?: number;
    sigHashType?: number;
    segwit?: boolean;
    additionals?: Array<string>;
    expiryHeight?: Buffer;
    onDeviceSignatureRequested?: () => void;
    onDeviceSignatureGranted?: () => void;
    onDeviceStreaming?: (arg0: {
      progress: number;
      total: number;
      index: number;
    }) => void;
  }) {
    const {
      btc,
      fromAccount,
      txInfo,
      lockTime,
      sigHashType,
      segwit,
      additionals,
      expiryHeight,
      onDeviceSignatureRequested,
      onDeviceSignatureGranted,
      onDeviceStreaming,
    } = params;

    const length = txInfo.outputs.reduce((sum, output) => {
      return sum + 8 + output.script.length + 1;
    }, 1);
    const buffer = Buffer.allocUnsafe(length);
    const bufferWriter = new BufferWriter(buffer, 0);
    bufferWriter.writeVarInt(txInfo.outputs.length);
    txInfo.outputs.forEach((txOut) => {
      // xpub splits output into smaller outputs than SAFE_MAX_INT anyway
      bufferWriter.writeUInt64(txOut.value.toNumber());
      bufferWriter.writeVarSlice(txOut.script);
    });
    const outputScriptHex = buffer.toString("hex");

    const associatedKeysets = txInfo.associatedDerivations.map(
      ([account, index]) =>
        `${fromAccount.params.path}/${fromAccount.params.index}'/${account}/${index}`
    );
    type Inputs = [
      Transaction,
      number,
      string | null | undefined,
      number | null | undefined
    ][];
    const inputs: Inputs = txInfo.inputs.map((i) => [
      btc.splitTransaction(i.txHex, true),
      i.output_index,
      null,
      null,
    ]);

    log("hw", `createPaymentTransactionNew`, {
      associatedKeysets,
      outputScriptHex,
      lockTime,
      sigHashType,
      segwit,
      additionals: additionals || [],
      expiryHeight: expiryHeight && expiryHeight.toString("hex"),
    });

    const lastOutputIndex = txInfo.outputs.length - 1;

    const tx = await btc.createPaymentTransactionNew({
      inputs,
      associatedKeysets,
      outputScriptHex,
      ...(params.lockTime && { lockTime: params.lockTime }),
      ...(params.sigHashType && { sigHashType: params.sigHashType }),
      ...(params.segwit && { segwit: params.segwit }),
      // initialTimestamp,
      ...(params.expiryHeight && { expiryHeight: params.expiryHeight }),
      ...(txInfo.outputs[lastOutputIndex]?.isChange && {
        changePath: `${fromAccount.params.path}/${fromAccount.params.index}'/${txInfo.changeAddress.account}/${txInfo.changeAddress.index}`,
      }),
      additionals: additionals || [],
      onDeviceSignatureRequested,
      onDeviceSignatureGranted,
      onDeviceStreaming,
    });

    return tx;
  }

  // eslint-disable-next-line class-methods-use-this
  async broadcastTx(fromAccount: Account, tx: string) {
    const res = await fromAccount.xpub.broadcastTx(tx);
    return res.data.result;
  }
}

export default BitcoinLikeWallet;
