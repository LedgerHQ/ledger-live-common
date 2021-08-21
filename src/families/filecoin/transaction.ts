import type { Transaction, TransactionRaw } from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw,
} from "../../transaction/common";
import type { Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";
import BigNumber from "bignumber.js";

export const formatTransaction = (t: Transaction, account: Account): string => `
SEND ${formatCurrencyUnit(getAccountUnit(account), t.amount, {
  showCode: true,
  disableRounding: true,
})}
TO ${t.recipient}`;

const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  return {
    ...common,
    family: tr.family,
    version: tr.version,
    method: tr.method,
    nonce: tr.nonce,
    gasFeeCap: new BigNumber(tr.gasFeeCap),
    gasLimit: tr.gasLimit,
    gasPremium: new BigNumber(tr.gasPremium),
  };
};

const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);

  // FIXME Filecoin - Check that tx gets in the correct format
  return {
    ...common,
    method: t.method,
    version: t.version,
    family: t.family,
    nonce: t.nonce,
    gasFeeCap: t.gasFeeCap.toString(),
    gasLimit: t.gasLimit,
    gasPremium: t.gasPremium.toString(),
  };
};

export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
};
