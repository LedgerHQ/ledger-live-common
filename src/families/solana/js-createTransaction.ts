import { BigNumber } from "bignumber.js";
import type { Transaction /* TransactionMode */ } from "./types";
import { Account } from "../../types";

const createTransaction = (_: Account): Transaction => {
  return {
    family: "solana",
    amount: new BigNumber(0),
    recipient: "",
    model: {
      kind: "transfer",
      uiState: {
        memo: undefined,
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
