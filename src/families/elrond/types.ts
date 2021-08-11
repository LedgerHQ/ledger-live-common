import type { BigNumber } from "bignumber.js";
import type { TransactionCommon, TransactionCommonRaw } from "../../types/transaction";
export type CoreStatics = {};
export type CoreAccountSpecifics = {};
export type CoreOperationSpecifics = {};
export type CoreCurrencySpecifics = {};
export type ElrondResources = {
  nonce: number;
};

/**
 * Elrond account resources from raw JSON
 */
export type ElrondResourcesRaw = {
  nonce: number;
};

/**
 * Elrond transaction
 */
export type Transaction = TransactionCommon & {
  mode: string;
  family: "elrond";
  fees: BigNumber | null | undefined;
  txHash?: string;
  sender?: string;
  receiver?: string;
  value?: BigNumber;
  blockHash?: string;
  blockHeight?: number;
  timestamp?: number;
  nonce?: number;
  status?: string;
  fee?: BigNumber;
};

/**
 * Elrond transaction from a raw JSON
 */
export type TransactionRaw = TransactionCommonRaw & {
  family: "elrond";
  mode: string;
  fees: string | null | undefined;
};
export type ElrondValidator = {
  bls: string;
  identity: string;
  owner: string;
  provider: string;
  type: string;
  status: string;
  nonce: number;
  stake: BigNumber;
  topUp: BigNumber;
  locked: BigNumber;
  online: boolean;
};
export type ElrondPreloadData = {
  validators: Record<string, any>;
};
export const reflect = (_declare: any) => {};