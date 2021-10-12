import { BigNumber } from "bignumber.js";
import type { Transaction, TransactionRaw } from "./types";
import {
    fromTransactionCommonRaw,
    toTransactionCommonRaw,
} from "../../transaction/common";
import type { Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";

export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
    const common = fromTransactionCommonRaw(tr);
    const { networkInfo } = tr;
    return {
        ...common,
        networkInfo: networkInfo && {
            family: "solana",
            feeSOLPerSignature: new BigNumber(networkInfo.feeSOLPerSignature),
            recentBlockhash: networkInfo.recentBlockhash,
        },
        family: tr.family,
    };
};

export const toTransactionRaw = (t: Transaction): TransactionRaw => {
    const common = toTransactionCommonRaw(t);
    const { networkInfo } = t;
    return {
        ...common,
        networkInfo: networkInfo && {
            family: "solana",
            feeSOLPerSignature: networkInfo.feeSOLPerSignature.toString(),
            recentBlockhash: networkInfo.recentBlockhash,
        },
        family: t.family,
    };
};

export const formatTransaction = (
    t: Transaction,
    mainAccount: Account
): string => `
  SEND ${t.amount} SOL
  TO ${t.recipient}`;

export default {
    formatTransaction,
    fromTransactionRaw,
    toTransactionRaw,
};
