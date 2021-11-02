import { BigNumber } from "bignumber.js";
import type { Transaction /* TransactionMode */ } from "./types";
import { log } from "@ledgerhq/logs";
import { Account } from "../../types";

/**
 * Create an empty transaction
 *
 * @returns {Transaction}
 */
const createTransaction = (account: Account): Transaction => {
  return {
    //mode: { kind: "native" },
    family: "solana",
    amount: new BigNumber(0),
    recipient: "",
  };
};

export const updateTransaction = (
  t: Transaction,
  patch: Partial<Transaction>
): Transaction => {
  return { ...t, ...patch };
};

export default createTransaction;
