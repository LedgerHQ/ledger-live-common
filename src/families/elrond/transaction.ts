import type { Transaction, TransactionRaw } from "./types";
import { BigNumber } from "bignumber.js";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw,
} from "../../transaction/common";
import type { Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";
export const formatTransaction = (
  { mode, amount, recipient, useAllAmount }: Transaction,
  account: Account
): string => `
${mode.toUpperCase()} ${
  useAllAmount
    ? "MAX"
    : amount.isZero()
    ? ""
    : " " +
      formatCurrencyUnit(getAccountUnit(account), amount, {
        showCode: true,
        disableRounding: true,
      })
}${recipient ? `\nTO ${recipient}` : ""}`;
export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  return {
    ...common,
    family: tr.family,
    mode: tr.mode,
    fees: tr.fees ? new BigNumber(tr.fees) : null,
    txHash: tr.txHash,
    sender: tr.sender,
    timestamp: tr.timestamp,
    nonce: tr.nonce,
    status: tr.status,
    round: tr.round,
    miniBlockHash: tr.miniBlockHash,
  };
};
export const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  return {
    ...common,
    family: t.family,
    mode: t.mode,
    fees: t.fees?.toString() || null,
    txHash: t.txHash,
    sender: t.sender,
    timestamp: t.timestamp,
    nonce: t.nonce,
    status: t.status,
    round: t.round,
    miniBlockHash: t.miniBlockHash,
  };
};
export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
};
