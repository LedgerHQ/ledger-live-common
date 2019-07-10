// @flow
import { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw
} from "../types/transaction";
import type { Transaction, TransactionRaw } from "../types";

export const fromTransactionCommonRaw = (
  raw: TransactionRaw
): TransactionCommon => {
  const common: TransactionCommon = {
    amount: BigNumber(raw.amount),
    recipient: raw.recipient
  };
  if ("useAllAmount" in raw) {
    common.useAllAmount = raw.useAllAmount;
  }
  if ("tokenAccountId" in raw) {
    common.tokenAccountId = raw.tokenAccountId;
  }
  return common;
};

export const toTransactionCommonRaw = (
  raw: Transaction
): TransactionCommonRaw => {
  const common: TransactionCommonRaw = {
    amount: raw.amount.toString(),
    recipient: raw.recipient
  };
  if ("useAllAmount" in raw) {
    common.useAllAmount = raw.useAllAmount;
  }
  if ("tokenAccountId" in raw) {
    common.tokenAccountId = raw.tokenAccountId;
  }
  return common;
};
