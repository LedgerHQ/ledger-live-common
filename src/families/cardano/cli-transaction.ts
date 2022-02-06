import flatMap from "lodash/flatMap";
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
  opts: Record<string, any>
): Transaction[] {
  return flatMap(transactions, ({ transaction, account }) => {
    if (transaction.family !== "cardano") {
      throw new Error("transaction is not of type cardano");
    }

    if (account.type === "Account" && !account.cardanoResources) {
      throw new Error("unactivated account");
    }

    return {
      ...transaction,
      family: "cardano",
      mode: opts.mode || "send",
    };
  });
}

export default {
  options,
  inferTransactions,
};
