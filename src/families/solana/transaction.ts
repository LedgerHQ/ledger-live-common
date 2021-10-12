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
    const { networkInfo, fees, family } = tr;
    return {
        ...common,
        fees: fees === undefined ? undefined : new BigNumber(fees),
        networkInfo: networkInfo && {
            family,
            lamportsPerSignature: new BigNumber(
                networkInfo.lamportPerSignature
            ),
        },
        family,
    };
};

export const toTransactionRaw = (t: Transaction): TransactionRaw => {
    const common = toTransactionCommonRaw(t);
    const { networkInfo, family, fees } = t;
    return {
        ...common,
        fees: fees && fees.toString(),
        networkInfo: networkInfo && {
            family: family,
            lamportPerSignature: networkInfo.lamportsPerSignature.toString(),
        },
        family: t.family,
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
): string => `
  SEND ${t.useAllAmount ? "MAX" : lamportsToSOL(mainAccount, t.amount)}
  TO ${t.recipient}`;

export default {
    formatTransaction,
    fromTransactionRaw,
    toTransactionRaw,
};
