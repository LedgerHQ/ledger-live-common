import BigNumber from "bignumber.js";
import type { Transaction, AccountLike } from "../../types";

const options = [
    {
        name: "mode",
        type: String,
        desc: "mode of transaction: send",
    },
];

function inferTransactions(
    transactions: Array<{ account: AccountLike; transaction: Transaction }>,
    opts: any
): Transaction[] {
    return transactions.map(({ account, transaction }) => {
        console.log("--- tx to infer from ---", transaction);
        console.log("--- tx amount ---", transaction.amount.toExponential());
        console.log("--- acc to infer from ---", account);
        return {
            ...transaction,
            family: "solana",
            networkInfo: undefined,
            mode: opts.mode || "send",
        };
    });
    /*
    return flatMap(transactions, ({ transaction, account }) => {
        if (!transaction.family !== "solana") {
            throw new Error("transaction is not of type Solana");
        }

        if (account.type === "Account" && !account.myCoinResources) {
            throw new Error("unactivated account");
        }

        return {
            ...transaction,
            family: "solana",
            mode: opts.mode || "send",
        };

        return {
            ...transaction,
            family: "solana",
            networkInfo: {},
            mode: opts.mode || "send",
        };
    });
    */
}

export default {
    options,
    inferTransactions,
};
