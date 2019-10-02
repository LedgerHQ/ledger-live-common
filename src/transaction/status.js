// @flow

import { BigNumber } from "bignumber.js";
import { deserializeError, serializeError } from "@ledgerhq/errors";
import type {
  TransactionStatusRaw,
  TransactionStatus
} from "../types/transaction";

const fromErrorRaw = (raw: ?string): ?Error => {
  if (!raw) return null;
  return deserializeError(JSON.parse(raw));
};

const toErrorRaw = (raw: ?Error): ?string => {
  if (!raw) return null;
  return JSON.stringify(serializeError(raw));
};

export const cleanErrorsAndWarnings = (ts: any) => ({
  ...ts,
  errors: Object.keys(ts.errors).reduce((result, key) => {
    if (!ts.errors[key]) {
      return result;
    }
    return {
      ...result,
      [key]: { name: ts.errors[key].name, message: ts.errors[key].message }
    };
  }, {}),
  warnings: Object.keys(ts.warnings).reduce((result, key) => {
    if (!ts.warnings[key]) {
      return result;
    }
    return {
      ...result,
      [key]: { name: ts.warnings[key].name, message: ts.warnings[key].message }
    };
  }, {}),
});

export const fromTransactionStatusRaw = (
  ts: TransactionStatusRaw
): TransactionStatus => ({
  errors: ts.errors, //FIXME, not going back like this
  warnings: ts.warnings,
  estimatedFees: BigNumber(ts.estimatedFees),
  amount: BigNumber(ts.amount),
  totalSpent: BigNumber(ts.totalSpent),
  useAllAmount: ts.useAllAmount,
  recipientIsReadOnly: ts.recipientIsReadOnly
});

export const toTransactionStatusRaw = (
  ts: TransactionStatus
): TransactionStatusRaw =>
  cleanErrorsAndWarnings({
    errors: ts.errors,
    warnings: ts.warnings,
    estimatedFees: ts.estimatedFees.toString(),
    amount: ts.amount.toString(),
    totalSpent: ts.totalSpent.toString(),
    useAllAmount: ts.useAllAmount,
    recipientIsReadOnly: ts.recipientIsReadOnly
  });
