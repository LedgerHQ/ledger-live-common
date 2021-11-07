import { BigNumber } from "bignumber.js";
import type { Command, Transaction /* TransactionMode */ } from "./types";
import { log } from "@ledgerhq/logs";
import { Account, AccountLike } from "../../types";

/**
 * Create an empty transaction
 *
 * @returns {Transaction}
 */
const createTransaction = (mainAccount: Account): Transaction => {
  return {
    family: "solana",
    amount: new BigNumber(0),
    recipient: "",
    command: {
      kind: "transfer",
    },
  };
};

export const updateTransaction = (
  t: Transaction,
  patch: Partial<Transaction>
): Transaction => {
  return { ...t, ...patch };
};

function switchExpr<T extends string | number, S>(
  value: T,
  record: Record<T, S>
) {
  return record[value];
}

export default createTransaction;
