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
    gasFeeCap: new BigNumber(tr.gasFeeCap ? tr.gasFeeCap : 0),
    gasLimit: new BigNumber(tr.gasLimit ? tr.gasLimit : 0),
    gasPremium: new BigNumber(tr.gasPremium ? tr.gasPremium : 0),
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
    gasFeeCap: t.gasFeeCap ? t.gasFeeCap.toString() : "0",
    gasLimit: t.gasLimit ? t.gasLimit.toString() : "0",
    gasPremium: t.gasPremium ? t.gasPremium.toString() : "0",
  };
};

export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
};
