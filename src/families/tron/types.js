// @flow

import type {
  TransactionCommon,
  TransactionCommonRaw
} from "../../types/transaction";

export type CoreStatics = {};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type TronOperationMode = "send" | "freeze" | "unfreeze";
export type TronResource = "bandwidth" | "energy";

export type NetworkInfo = {|
  family: "tron",
  freeNetUsed: number,
  freeNetLimit: number,
  NetUsed: number,
  NetLimit: number
|};

export type NetworkInfoRaw = {|
  family: "tron",
  freeNetUsed: number,
  freeNetLimit: number,
  NetUsed: number,
  NetLimit: number
|};

export type Transaction = {|
  ...TransactionCommon,
  family: "tron",
  mode: TronOperationMode,
  resource: ?TronResource,
  networkInfo: ?NetworkInfo,
  duration: ?number
|};

export type TransactionRaw = {|
  ...TransactionCommonRaw,
  mode: TronOperationMode,
  family: "tron",
  resource: ?TronResource,
  networkInfo: ?NetworkInfoRaw,
  duration: ?number
|};

export type SendTransactionData = {|
  to_address: string,
  owner_address: string,
  amount: number,
  asset_name: ?string
|};

export type UnfreezeTransactionData = {|
  receiver_address?: string,
  owner_address: string,
  resource: ?TronResource
|};

export type FreezeTransactionData = {|
  receiver_address?: string,
  owner_address: string,
  frozen_balance: number,
  frozen_duration: number,
  resource: ?TronResource
|};

export type SendTransactionDataSuccess = {|
  raw_data_hex: string,
  txID: string,
  signature: ?(string[])
|};
// TODO: What needed it's store and not the entire object.
// Check if we need to type everything from the API call

export const reflect = (_declare: *) => {};
