// @flow

import type {
  TransactionCommon,
  TransactionCommonRaw
} from "../../types/transaction";
import { BigNumber } from "bignumber.js";

export type CoreStatics = {};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type NetworkInfo = {|
  family: "stellar",
  serverFee: BigNumber,
  baseReserve: BigNumber
|};

export type NetworkInfoRaw = {|
  family: "stellar",
  serverFee: string,
  baseReserve: string
|};

export type Transaction = {|
  ...TransactionCommon,
  family: "stellar",
  fee: ?BigNumber,
  networkInfo: ?NetworkInfo,
  memo: ?string,
  memoType: ?string
|};

export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "stellar",
  fee: ?string,
  networkInfo: ?NetworkInfoRaw,
  memo: ?string,
  memoType: ?string
|};

export const reflect = (_declare: *) => {};
