import type { Transaction, TransactionRaw } from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw,
} from "../../transaction/common";
import type { Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";
import BigNumber from "bignumber.js";

export const formatTransaction = (
  { recipient, useAllAmount, amount }: Transaction,
  account: Account
): string => `
SEND ${
  useAllAmount
    ? "MAX"
    : amount.isZero()
    ? ""
    : " " +
      formatCurrencyUnit(getAccountUnit(account), amount, {
        showCode: true,
        disableRounding: true,
      })
}
TO ${recipient}`;

export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  return {
    ...common,
    family: tr.family,
    version: tr.version,
    method: tr.method,
    nonce: tr.nonce,
    amount: new BigNumber(tr.amount),
    gasFeeCap: new BigNumber(tr.gasFeeCap),
    gasLimit: new BigNumber(tr.gasLimit),
    gasPremium: new BigNumber(tr.gasPremium),
  };
};

const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);

  return {
    ...common,
    method: t.method,
    version: t.version,
    family: t.family,
    nonce: t.nonce,
    amount: t.amount.toFixed(),
    gasFeeCap: t.gasFeeCap.toString(),
    gasLimit: t.gasLimit.toNumber(),
    gasPremium: t.gasPremium.toString(),
  };
};

export function fromOperationExtraRaw(
  extra: Record<string, any> | null | undefined
): Record<string, any> | null | undefined {
  if (extra) {
    const newExtra = { ...extra };
    const { gasLimit, gasPremium, gasFeeCap } = extra;

    if (gasLimit !== undefined) newExtra.gasLimit = new BigNumber(gasLimit);
    if (gasPremium !== undefined)
      newExtra.gasPremium = new BigNumber(gasPremium);
    if (gasFeeCap !== undefined) newExtra.gasFeeCap = new BigNumber(gasFeeCap);

    return newExtra;
  }

  return extra;
}
export function toOperationExtraRaw(
  extra: Record<string, any> | null | undefined
): Record<string, any> | null | undefined {
  if (extra) {
    const newExtra = { ...extra };
    const { gasLimit, gasPremium, gasFeeCap } = extra;

    if (gasLimit !== undefined) newExtra.gasLimit = gasLimit.toNumber();
    if (gasPremium !== undefined) newExtra.gasPremium = gasPremium.toFixed();
    if (gasFeeCap !== undefined) newExtra.gasFeeCap = gasFeeCap.toFixed();

    return newExtra;
  }

  return extra;
}

export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
  fromOperationExtraRaw,
  toOperationExtraRaw,
};
