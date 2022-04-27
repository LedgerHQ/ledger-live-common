import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

export type NetworkInfo = {
  family: "osmosis";
};
export type NetworkInfoRaw = {
  family: "osmosis";
};

export type Transaction = TransactionCommon & {
  family: "osmosis";
  mode: string;
  fees: BigNumber | null;
  gas: BigNumber | null | undefined;
  memo: string | null | undefined;
};

export type TransactionRaw = TransactionCommonRaw & {
  family: "osmosis";
  mode: string;
  fees: string | null;
  gas: string | null | undefined;
  memo: string | null | undefined;
};

export type StatusErrorMap = {
  recipient?: Error;
  amount?: Error;
  fees?: Error;
  validators?: Error;
  delegate?: Error;
  redelegation?: Error;
  unbonding?: Error;
  claimReward?: Error;
  feeTooHigh?: Error;
};

export type TransactionStatus = {
  errors: StatusErrorMap;
  warnings: StatusErrorMap;
  estimatedFees: BigNumber;
  amount: BigNumber;
  totalSpent: BigNumber;
};

export type CoreStatics = Record<any, any>;
export type CoreAccountSpecifics = Record<any, any>;
export type CoreOperationSpecifics = Record<any, any>;
export type CoreCurrencySpecifics = Record<any, any>;

export const reflect = (_declare: any) => {};
