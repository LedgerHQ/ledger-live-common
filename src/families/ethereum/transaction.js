// @flow
import { BigNumber } from "bignumber.js";
import type { Transaction, TransactionRaw } from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw
} from "../../transaction/common";

const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  return {
    ...common,
    family: tr.family,
    gasPrice: tr.gasPrice ? BigNumber(tr.gasPrice) : null,
    gasLimit: BigNumber(tr.gasLimit),
    feeCustomUnit: tr.feeCustomUnit, // FIXME this is not good.. we're dereferencing here. we should instead store an index (to lookup in currency.units on UI)
    networkInfo: tr.networkInfo
  };
};

const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  return {
    ...common,
    family: t.family,
    gasPrice: t.gasPrice ? t.gasPrice.toString() : null,
    gasLimit: t.gasLimit.toString(),
    feeCustomUnit: t.feeCustomUnit, // FIXME this is not good.. we're dereferencing here. we should instead store an index (to lookup in currency.units on UI)
    networkInfo: t.networkInfo
  };
};

export default { fromTransactionRaw, toTransactionRaw };
