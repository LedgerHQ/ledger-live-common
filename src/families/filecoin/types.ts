import { TransactionCommon, TransactionCommonRaw } from "../../types";
import { Range, RangeRaw } from "../../range";
import { BigNumber } from "bignumber.js";

type FamilyType = "filecoin";

export type NetworkInfo = {
  family: FamilyType;
  gasPrice: Range;
};
export type NetworkInfoRaw = {
  family: FamilyType;
  gasPrice: RangeRaw;
};

export type Transaction = TransactionCommon & {
  family: FamilyType;
  nonce?: number;
  data?: Buffer;
  method: number;
  version: number;
  gasPrice?: BigNumber | null;
  gasLimit?: BigNumber | null;
  gasFeeCap?: BigNumber | null;
  gasPremium?: BigNumber | null;
};
export type TransactionRaw = TransactionCommonRaw & {
  family: FamilyType;
  nonce?: number;
  data?: string;
  method: number;
  gasPrice?: string | null;
  gasLimit?: string | null;
  gasFeeCap?: string | null;
  gasPremium?: string | null;
};

export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;
export const reflect = (_declare: any) => {};
