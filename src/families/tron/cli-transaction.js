// @flow

import invariant from "invariant";
import flatMap from "lodash/flatMap";
import { getAccountCurrency } from "../../account";
import type {
  Transaction,
  Account,
  AccountLike,
  AccountLikeArray
} from "../../types";

const options = [
  {
    name: "token",
    alias: "t",
    type: String,
    desc: "use an token account children of the account"
  },
  {
    name: "mode",
    type: String,
    desc: "mode of transaction: send, freeze, unfreeze"
  },
  {
    name: "duration",
    type: String,
    desc: "duration in day"
  },
  {
    name: "resource",
    type: String,
    desc: "reward ENERGY or BANDWIDTH"
  }
];

function inferAccounts(account: Account, opts: Object): AccountLikeArray {
  invariant(account.currency.family === "tron", "tron family");
  if (!opts.token) return [account];
  return opts.token.map(token => {
    const subAccounts = account.subAccounts || [];
    if (token) {
      const subAccount = subAccounts.find(t => {
        const currency = getAccountCurrency(t);
        return (
          token.toLowerCase() === currency.ticker.toLowerCase() ||
          token.toLowerCase() === currency.id
        );
      });
      if (!subAccount) {
        throw new Error(
          "token account '" +
            token +
            "' not found. Available: " +
            subAccounts.map(t => getAccountCurrency(t).ticker).join(", ")
        );
      }
      return subAccount;
    }
  });
}

function inferTransactions(
  transactions: Array<{ account: AccountLike, transaction: Transaction }>,
  opts: Object,
  { inferAmount }: *
): Transaction[] {
  return flatMap(transactions, ({ transaction, account }) => {
    invariant(transaction.family === "tron", "tron family");

    return {
      ...transaction,
      mode: opts.mode || "send",
      family: "tron",
      subAccountId: account.type === "TokenAccount" ? account.id : null,
      resource: opts.resource
    };
  });
}

export default {
  options,
  inferAccounts,
  inferTransactions
};
