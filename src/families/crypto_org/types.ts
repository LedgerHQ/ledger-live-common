import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";
export type CoreStatics = Record<any, any>;
export type CoreAccountSpecifics = Record<any, any>;
export type CoreOperationSpecifics = Record<any, any>;
export type CoreCurrencySpecifics = Record<any, any>;
export type CryptoOrgResources = {
  bondedBalance: BigNumber;
  redelegatingBalance: BigNumber;
  unbondingBalance: BigNumber;
  commissions: BigNumber;
};
export type CryptoOrgResourcesRaw = {
  bondedBalance: string;
  redelegatingBalance: string;
  unbondingBalance: string;
  commissions: string;
};
export type Transaction = TransactionCommon & {
  mode: string;
  family: "crypto_org";
  fees?: BigNumber; // add here all transaction-specific fields if you implement other modes than "send"
};
export type TransactionRaw = TransactionCommonRaw & {
  family: "crypto_org";
  mode: string;
  fees?: string; // also the transaction fields as raw JSON data
};
export type CryptoOrgPreloadData = Record<any, any>;
export type NetworkInfo = {
  family: "crypto_org";
};
export type NetworkInfoRaw = {
  family: "crypto_org";
};
export const reflect = (_declare: any) => {};
