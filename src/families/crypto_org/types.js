// @flow

import type { Spec } from "../../libcore/types";
import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

export type CoreStatics = {};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type CryptoOrgResources = {|
  nonce: number,
  additionalBalance: BigNumber,
|};

export type CryptoOrgResourcesRaw = {|
  nonce: number,
  additionalBalance: string,
|};

export type Transaction = {|
  ...TransactionCommon,
  mode: string,
  family: "crypto_org",
  fees: ?BigNumber,
  // add here all transaction-specific fields if you implement other modes than "send"
|};


export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "crypto_org",
  mode: string,
  fees: ?string,
  // also the transaction fields as raw JSON data
|};

// NB this must be serializable (no Date, no BigNumber)
export type CyptoOrgValidatorItem = {|
  validatorAddress: string,
  name: string,
  votingPower: number, // value from 0.0 to 1.0 (normalized percentage)
  commission: number, // value from 0.0 to 1.0 (normalized percentage)
  estimatedYearlyRewardsRate: number, // value from 0.0 to 1.0 (normalized percentage)
|};

export type CryptoOrgPreloadData = {|
  validators: CyptoOrgValidatorItem[],
|};

export type NetworkInfo = {};

export type NetworkInfoRaw = {};


export const reflect = (declare: (string, Spec) => void) => {
  return {
    OperationMethods: {
    },
    AccountMethods: {
    },
  };
}