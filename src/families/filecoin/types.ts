import { TransactionCommon, TransactionCommonRaw } from "../../types";
import { Range, RangeRaw } from "../../range";
import { BigNumber } from "bignumber.js";

export type NetworkInfo = {
  family: "filecoin";
  gasPrice: Range;
};
export type NetworkInfoRaw = {
  family: "filecoin";
  gasPrice: RangeRaw;
};

export type Transaction = TransactionCommon & {
  family: "filecoin";
  nonce?: number;
  data?: Buffer;
  method: number;
  gasPrice: BigNumber | null | undefined;
  gasLimit: BigNumber | null | undefined;
  gasFeeCap: BigNumber | null | undefined;
  gasPremium: BigNumber | null | undefined;
};
export type TransactionRaw = TransactionCommonRaw & {
  family: "filecoin";
  nonce?: number;
  data?: string;
  method: number;
  gasPrice: string | null | undefined;
  gasLimit: string | null | undefined;
  gasFeeCap: string | null | undefined;
  gasPremium: string | null | undefined;
};

export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;
export const reflect = (_declare: any) => {};
