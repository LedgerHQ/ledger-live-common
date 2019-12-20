// @flow
import type { Transaction, TransactionRaw } from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw
} from "../../transaction/common";

const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  return {
    ...common,
    networkInfo: tr.networkInfo,
    family: tr.family,
    mode: tr.mode,
    resource: tr.resource || null,
    duration: tr.duration || 3
  };
};

const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  return {
    ...common,
    networkInfo: t.networkInfo,
    family: t.family,
    mode: t.mode,
    resource: t.resource || null,
    duration: t.duration || 3
  };
};

export default { fromTransactionRaw, toTransactionRaw };
