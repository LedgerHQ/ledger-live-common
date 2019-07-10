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

export const fromTransactionStatusRaw = (
  ts: TransactionStatusRaw
): TransactionStatus => ({
  transactionError: fromErrorRaw(ts.transactionError),
  recipientError: fromErrorRaw(ts.recipientError),
  recipientWarning: fromErrorRaw(ts.recipientWarning),
  showFeeWarning: ts.showFeeWarning,
  estimatedFees: BigNumber(ts.estimatedFees),
  amount: BigNumber(ts.amount),
  totalSpent: BigNumber(ts.totalSpent),
  useAllAmount: ts.useAllAmount
});

export const toTransactionStatusRaw = (
  ts: TransactionStatus
): TransactionStatusRaw => ({
  transactionError: toErrorRaw(ts.transactionError),
  recipientError: toErrorRaw(ts.recipientError),
  recipientWarning: toErrorRaw(ts.recipientWarning),
  showFeeWarning: ts.showFeeWarning,
  estimatedFees: ts.estimatedFees.toString(),
  amount: ts.amount.toString(),
  totalSpent: ts.totalSpent.toString(),
  useAllAmount: ts.useAllAmount
});
