import invariant from "invariant";
import { flatMap } from "lodash";
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
    opts: Record<string, string>
): Transaction[] {
    const mode = opts.mode || "send";
    invariant(mode === "send", "Only send mode is supported");
    return flatMap(transactions, ({ transaction, account }) => {
        invariant(transaction.family === "solana", "solana family");
        return transaction;
    });
}
export default {
    options,
    inferTransactions,
};
