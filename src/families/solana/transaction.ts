import { BigNumber } from "bignumber.js";
import type { CommandDescriptor, Transaction, TransactionRaw } from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw,
} from "../../transaction/common";
import type { Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";

export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  const { family, state, feeCalculator } = tr;
  return {
    ...common,
    family,
    state: JSON.parse(state),
    feeCalculator,
  };
};

// TODO: not to serialize errors and warnings?
export const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  const { family, state, feeCalculator } = t;
  return {
    ...common,
    family,
    state: JSON.stringify(state),
    feeCalculator,
  };
};

const lamportsToSOL = (account: Account, lamports: BigNumber) => {
  return formatCurrencyUnit(getAccountUnit(account), lamports, {
    showCode: true,
    disableRounding: true,
  });
};

export const formatTransaction = (
  tx: Transaction,
  mainAccount: Account
): string => {
  console.log(tx);
  return [
    `SEND ${tx.useAllAmount ? "ALL" : lamportsToSOL(mainAccount, tx.amount)}`,
    `TO ${tx.recipient}`,
    //t.memo ? `MEMO ${t.memo}` : "",
    //t.allowUnFundedRecipient ? "ALLOW UNFUNDED RECIPIENT: TRUE" : "",
  ]
    .filter(Boolean)
    .join("\n");
};

export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
};
