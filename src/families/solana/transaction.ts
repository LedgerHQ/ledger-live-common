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
  const { family, commandDescriptorRaw, fees } = tr;
  return {
    ...common,
    family,
    commandDescriptor: JSON.parse(commandDescriptorRaw),
    fees,
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

// TODO: not to serialize errors and warnings!
export const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  const { family, commandDescriptor, fees } = t;
  return {
    ...common,
    family,
    commandDescriptorRaw: JSON.stringify(commandDescriptor),
    fees,
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
