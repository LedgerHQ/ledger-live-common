import { TransactionCommon, TransactionCommonRaw } from "../../types";
import { Range, RangeRaw } from "../../range";

export type NetworkInfo = {
  family: "filecoin";
  gasPrice: Range;
};
export type NetworkInfoRaw = {
  family: "filecoin";
  gasPrice: RangeRaw;
};

export type Transaction = TransactionCommon & {
  family: "ethereum";
};
export type TransactionRaw = TransactionCommonRaw & {
  family: "ethereum";
};
export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;
export const reflect = (_declare: any) => {};
