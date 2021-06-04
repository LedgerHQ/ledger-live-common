export * from "./common";
export * from "./status";
export * from "./signOperation";
export * from "./deviceTransactionConfig";
import type { Account, Transaction, TransactionRaw } from "../types";
import transactionModulePerFamily from "../generated/transaction";
export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const TM = transactionModulePerFamily[tr.family];
  // $FlowFixMe i don't know how to prove this to flow
  return TM.fromTransactionRaw(tr);
};
export const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const TM = transactionModulePerFamily[t.family];
  // $FlowFixMe i don't know how to prove this to flow
  return TM.toTransactionRaw(t);
};
export const formatTransaction = (t: Transaction, a: Account): string => {
  const TM = transactionModulePerFamily[t.family];
  return TM.formatTransaction ? TM.formatTransaction(t, a) : "";
};
