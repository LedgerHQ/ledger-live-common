import { BigNumber } from "bignumber.js";
import type { Transaction /* TransactionMode */ } from "./types";
import { Account } from "../../types";

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
    state: {
      kind: "unprepared",
      mode: {
        kind: "transfer",
      },
    },
  };
};

export const updateTransaction = (
  t: Transaction,
  patch: Partial<Transaction>
): Transaction => {
  return { ...t, ...patch };
};

export default createTransaction;
