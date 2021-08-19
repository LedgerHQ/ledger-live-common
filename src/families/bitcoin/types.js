// @flow

import type { BigNumber } from "bignumber.js";
import type { SerializedAccount as WalletSerializedAccount } from "wallet-btc";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

export type CoreStatics = {};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type BitcoinInput = {
  address: ?string,
  value: ?BigNumber,
  previousTxHash: ?string, // FIXME Probably useless
  previousOutputIndex: number, // FIXME Probably useless
};

export type BitcoinInputRaw = [?string, ?string, ?string, number];

export type BitcoinOutput = {
  hash: string,
  outputIndex: number,
  blockHeight: ?number,
  address: ?string,
  isChange: boolean,
  value: BigNumber,
  rbf: boolean,
};

export type BitcoinOutputRaw = [
  string,
  number,
  ?number,
  ?string,
  number,
  string,
  number // rbf 0/1 for compression
];

export type BitcoinResources = {
  utxos: BitcoinOutput[],
  serializedData: WalletSerializedAccount,
};

export type BitcoinResourcesRaw = {
  utxos: BitcoinOutputRaw[],
  serializedData: WalletSerializedAccount,
};

export const BitcoinLikeFeePolicy = Object.freeze({
  PER_BYTE: "PER_BYTE",
  PER_KBYTE: "PER_KBYTE",
});

export const BitcoinLikeSigHashType = Object.freeze({
  SIGHASH_ALL: "0x01",
  SIGHASH_NONE: "0x02",
  SIGHASH_SINGLE: "0x03",
  SIGHASH_FORKID: "0x40",
  SIGHASH_ANYONECANPAY: "0x80",
});

// TODO maybe not all fields are useful
export type BitcoinLikeNetworkParameters = {
  // Name of the network.
  identifier: string,
  // Version of the Pay To Public Hash standard.
  P2PKHVersion: Buffer,
  // Version of the Pay To Script Hash standard.
  P2SHVersion: Buffer,
  // Version of the Extended Public Key standard.
  xpubVersion: Buffer,
  // Policy to use when expressing fee amount, values in BitcoinLikeFeePolicy
  feePolicy: string,
  // Minimal amount a UTXO should have before being considered BTC dust.
  dustAmount: BigNumber,
  // Constant prefix to prepend all signature messages.
  messagePrefix: string,
  // Are transactions encoded with timestamp?
  usesTimestampedTransaction: boolean,
  // Delay applied to all timestamps. Used to debounce transactions.
  timestampDelay: BigNumber,
  // Bitcoin signature flag indicating what part of a transaction a signature signs, values in BitcoinLikeSigHashType
  sigHash: string,
  // Addition BIPs enabled for this network.
  additionalBIPs: string[],
};

export type FeeItem = {
  key: string,
  speed: string,
  feePerByte: BigNumber,
};

export type FeeItems = {
  items: FeeItem[],
  defaultFeePerByte: BigNumber,
};

export type FeeItemRaw = {
  key: string,
  speed: string,
  feePerByte: string,
};

export type FeeItemsRaw = {
  items: FeeItemRaw[],
  defaultFeePerByte: string,
};

export type NetworkInfo = {|
  family: "bitcoin",
  feeItems: FeeItems,
|};

export type NetworkInfoRaw = {|
  family: "bitcoin",
  feeItems: FeeItemsRaw,
|};

export const bitcoinPickingStrategy = {
  DEEP_OUTPUTS_FIRST: 0,
  OPTIMIZE_SIZE: 1,
  MERGE_OUTPUTS: 2,
};

export type BitcoinPickingStrategy = $Values<typeof bitcoinPickingStrategy>;

// FIXME (legacy) the UtxoStrategy level should be flattened back in Transaction
export type UtxoStrategy = {
  strategy: BitcoinPickingStrategy,
  pickUnconfirmedRBF: boolean,
  excludeUTXOs: Array<{
    hash: string,
    outputIndex: number,
  }>,
};

export type Transaction = {|
  ...TransactionCommon,
  family: "bitcoin",
  utxoStrategy: UtxoStrategy, // FIXME Change to BitcoinPickingStrategy?
  rbf: boolean,
  feePerByte: ?BigNumber,
  networkInfo: ?NetworkInfo,
|};

export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "bitcoin",
  utxoStrategy: UtxoStrategy, // FIXME Change to BitcoinPickingStrategy?
  rbf: boolean,
  feePerByte: ?string,
  networkInfo: ?NetworkInfoRaw,
|};

export const reflect = (_declare: *) => {};
