import { BigNumber } from "bignumber.js";
import type { Command, Transaction, TransactionRaw } from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw,
} from "../../transaction/common";
import type { Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";

export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  const { family, commandRaw } = tr;
  return {
    ...common,
    family,
    command: JSON.parse(commandRaw),
    //family: 'solana'
    //mode,
    //fees: fees === undefined ? undefined : new BigNumber(fees),
    /*
    networkInfo: networkInfo && {
      family,
      lamportsPerSignature: new BigNumber(networkInfo.lamportPerSignature),
    },
    */
    //allowUnFundedRecipient,
  };
};

export const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  const { family, command } = t;
  return {
    ...common,
    family,
    commandRaw: JSON.stringify(command),
    //mode,
    /*
    fees: fees && fees.toString(),
    networkInfo: networkInfo && {
      family: family,
      lamportPerSignature: networkInfo.lamportsPerSignature.toString(),
    },
    family: t.family,
    memo,
    allowUnFundedRecipient,
    */
  };
};

const lamportsToSOL = (account: Account, lamports: BigNumber) => {
  return formatCurrencyUnit(getAccountUnit(account), lamports, {
    showCode: true,
    disableRounding: true,
  });
};

export const formatTransaction = (
  t: Transaction,
  mainAccount: Account
): string =>
  [
    `SEND ${t.useAllAmount ? "MAX" : lamportsToSOL(mainAccount, t.amount)}`,
    `TO ${t.recipient}`,
    //t.memo ? `MEMO ${t.memo}` : "",
    //t.allowUnFundedRecipient ? "ALLOW UNFUNDED RECIPIENT: TRUE" : "",
  ]
    .filter(Boolean)
    .join("\n");

export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
};
