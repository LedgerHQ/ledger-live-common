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
    feeSOLPerSignature: BigNumber;
    recentBlockhash: string;
};

export type NetworkInfoRaw = {
    family: "solana";
    feeSOLPerSignature: string;
    recentBlockhash: string;
};

export type Transaction = TransactionCommon & {
    family: "solana";
    networkInfo?: NetworkInfo;
};
export type TransactionRaw = TransactionCommonRaw & {
    family: "solana";
    networkInfo?: NetworkInfoRaw;
};

export const reflect = (_declare: any): void => {};
