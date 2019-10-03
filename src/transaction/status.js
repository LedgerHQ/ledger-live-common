// @flow

import mapValues from "lodash/mapValues";
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
  }, {})
});

export const fromTransactionStatusRaw = (
  ts: TransactionStatusRaw
): TransactionStatus => ({
  errors: mapValues(ts.errors, fromErrorRaw),
  warnings: mapValues(ts.warnings, fromErrorRaw),
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
    errors: mapValues(ts.errors, toErrorRaw),
    warnings: mapValues(ts.warnings, toErrorRaw),
    estimatedFees: ts.estimatedFees.toString(),
    amount: ts.amount.toString(),
    totalSpent: ts.totalSpent.toString(),
    useAllAmount: ts.useAllAmount,
    recipientIsReadOnly: ts.recipientIsReadOnly
  });
