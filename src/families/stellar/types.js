// @flow

import type {
  TransactionCommon,
  TransactionCommonRaw
} from "../../types/transaction";

export type CoreStatics = {};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type NetworkInfo = {|
  family: "stellar"
|};

export type NetworkInfoRaw = {|
  family: "stellar"
|};

export type Transaction = {|
  ...TransactionCommon,
  family: "stellar"
|};

export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "stellar"
|};

export const reflect = (_declare: *) => {};
