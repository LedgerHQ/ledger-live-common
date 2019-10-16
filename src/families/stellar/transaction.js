// @flow
import type { Transaction, TransactionRaw } from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw
} from "../../transaction/common";
import { BigNumber } from "bignumber.js";

const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  const { networkInfo } = tr;
  return {
    ...common,
    family: tr.family,
    fee: tr.fee ? BigNumber(tr.fee) : null,
    memo: tr.memo ? tr.memo : undefined,
    memoType: tr.memoType ? tr.memoType : "MEMO_NONE",
    networkInfo: networkInfo && {
      family: networkInfo.family,
      serverFee: BigNumber(networkInfo.serverFee),
      baseReserve: BigNumber(networkInfo.baseReserve)
    }
  };
};

const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  const { networkInfo } = t;
  return {
    ...common,
    family: t.family,
    fee: t.fee ? t.fee.toString() : null,
    memo: t.memo ? t.memo : undefined,
    memoType: t.memoType ? t.memoType : "MEMO_TYPE",
    networkInfo: networkInfo && {
      family: networkInfo.family,
      serverFee: networkInfo.serverFee.toString(),
      baseReserve: networkInfo.baseReserve.toString()
    }
  };
};

export default { fromTransactionRaw, toTransactionRaw };
