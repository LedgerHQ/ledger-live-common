import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

// for legacy reasons export the types
export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;

export type NetworkInfo = {
  family: "solana";
  lamportsPerSignature: BigNumber;
};

export type NetworkInfoRaw = {
  family: "solana";
  lamportPerSignature: string;
};

export type Transaction = TransactionCommon & {
  family: "solana";
  fees?: BigNumber;
  networkInfo?: NetworkInfo;
  memo?: string;
  allowNotCreatedRecipient?: boolean;
};
export type TransactionRaw = TransactionCommonRaw & {
  family: "solana";
  fees?: string;
  networkInfo?: NetworkInfoRaw;
  memo?: string;
  allowNotCreatedRecipient?: boolean;
};

export const reflect = (_declare: any): void => {};
