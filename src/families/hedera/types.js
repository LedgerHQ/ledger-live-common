// @flow
import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw
} from "../../types/transaction";
import type { Transaction } from "@hashgraph/sdk";

/**
 * Hedera account resources
 */
export type HederaResources = {|
  additionalBalance: BigNumber
|};

/**
 * Hedera account resources from raw JSON
 */
export type HederaResourcesRaw = {|
  additionalBalance: string
|};

/**
 * Hedera transaction from a raw JSON
 */
export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "hedera",
  mode: string,
  fees: ?string
  // also the transaction fields as raw JSON data
|};

/**
 * Hedera currency data that will be preloaded.
 * You can for instance add a list of validators for Proof-of-Stake blockchains,
 * or any volatile data that could not be set as constants in the code (staking progress, fee estimation variables, etc.)
 */
export type HederaPreloadData = {|
  somePreloadedData: Object
|};

export const reflect = (_declare: *) => {};

export type { Transaction };
