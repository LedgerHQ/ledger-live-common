import {
  BroadcastArg0,
  Operation,
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types";
import { BigNumber } from "bignumber.js";

type FamilyType = "filecoin";

export type NetworkInfo = {
  family: FamilyType;
};
export type NetworkInfoRaw = {
  family: FamilyType;
};

export type Transaction = TransactionCommon & {
  family: FamilyType;
  nonce: number;
  data?: Buffer;
  method: number;
  version: number;
  params?: string;
  gasLimit: number;
  gasFeeCap: BigNumber;
  gasPremium: BigNumber;
};
export type TransactionRaw = TransactionCommonRaw & {
  family: FamilyType;
  version: number;
  nonce: number;
  data?: string;
  method: number;
  gasLimit: number;
  gasFeeCap: string;
  gasPremium: string;
};

export type BroadcastFnSignature = (arg0: BroadcastArg0) => Promise<Operation>;

export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;
export const reflect = (_declare: any) => {};
