import invariant from "invariant";
import flatMap from "lodash/flatMap";

import type {
  Transaction,
  Account,
  AccountLike,
  AccountLikeArray,
} from "../../types";

const options = [];

function inferAccounts(
  account: Account,
  opts: Record<string, any>
): AccountLikeArray {
  invariant(account.currency.family === "filecoin", "filecoin family");

  const accounts: Account[] = [account];
  return accounts;
}

function inferTransactions(
  transactions: Array<{
    account: AccountLike;
    transaction: Transaction;
    mainAccount: Account;
  }>,
  opts: Record<string, any>,
  { inferAmount }: any
): Transaction[] {
  return flatMap(transactions, ({ transaction, account, mainAccount }) => {
    invariant(transaction.family === "filecoin", "filecoin family");

    return {
      ...transaction,
      family: "filecoin",
    } as Transaction;
  });
}

export default {
  options,
  inferAccounts,
  inferTransactions,
};
