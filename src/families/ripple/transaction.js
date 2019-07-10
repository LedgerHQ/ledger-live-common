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
    tag: tr.tag,
    fee: tr.fee ? BigNumber(tr.fee) : null,
    feeCustomUnit: tr.feeCustomUnit, // FIXME this is not good.. we're dereferencing here. we should instead store an index (to lookup in currency.units on UI)
    networkInfo: tr.networkInfo && {
      serverFee: BigNumber(tr.networkInfo.serverFee)
    }
  };
};

const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  return {
    ...common,
    family: t.family,
    tag: t.tag,
    fee: t.fee ? t.fee.toString() : null,
    feeCustomUnit: t.feeCustomUnit, // FIXME this is not good.. we're dereferencing here. we should instead store an index (to lookup in currency.units on UI)
    networkInfo: t.networkInfo && {
      serverFee: t.networkInfo.serverFee.toString()
    }
  };
};

export default { fromTransactionRaw, toTransactionRaw };
