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

/*
type TokenTransactionSpec = {
  kind: "prepared";
  mintAddress: string;
  decimals: number;
};

type UnpreparedTokenTransactionSpec = {
  kind: "unprepared";
  subAccountId: string;
};

type TokenTransactionMode = {
  kind: "token";
  fundRecipient: boolean;
  spec: UnpreparedTokenTransactionSpec | TokenTransactionSpec;
};

type NativeTransactionMode = {
  kind: "native";
};

export type TransactionMode = NativeTransactionMode | TokenTransactionMode;
*/

export type Transaction = TransactionCommon & {
  family: "solana";
  //mode: TransactionMode;
  fees?: BigNumber;
  networkInfo?: NetworkInfo;
  memo?: string;
  allowUnFundedRecipient?: boolean;
};
export type TransactionRaw = TransactionCommonRaw & {
  family: "solana";
  //mode: TransactionMode;
  fees?: string;
  networkInfo?: NetworkInfoRaw;
  memo?: string;
  allowUnFundedRecipient?: boolean;
};

export const reflect = (_declare: any): void => {};
