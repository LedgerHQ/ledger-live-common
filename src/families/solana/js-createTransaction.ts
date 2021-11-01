import { BigNumber } from "bignumber.js";
import type { Transaction, TransactionMode } from "./types";

/**
 * Create an empty transaction
 *
 * @returns {Transaction}
 */
const createTransaction = (): Transaction => ({
  mode: { kind: "native" }, // default mode
  family: "solana",
  amount: new BigNumber(0),
  recipient: "",
});

export const updateTransaction = (
  t: Transaction,
  patch: Transaction
): Transaction => {
  const mode: TransactionMode =
    t.subAccountId === patch.subAccountId
      ? patch.mode
      : patch.subAccountId
      ? {
          kind: "token",
          fundRecipient: false,
          spec: {
            kind: "unprepared",
            subAccountId: patch.subAccountId,
          },
        }
      : { kind: "native" };

  return {
    ...t,
    ...patch,
    mode,
  };
};

export default createTransaction;
