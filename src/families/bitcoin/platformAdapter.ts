import { BitcoinTransaction as PlatformTransaction } from "ledger-live-platform-sdk";
import { Transaction } from "./types";

export const CAN_EDIT_FEES = true;

export const areFeesProvided = (tx: PlatformTransaction): boolean =>
  !!tx.feePerByte;

export const convertToLiveTransaction = (
  tx: PlatformTransaction
): Partial<Transaction> => {
  const hasFeesProvided = areFeesProvided(tx);

  const liveTx: Partial<Transaction> = {
    ...tx,
    amount: tx.amount,
    recipient: tx.recipient,
    feePerByte: tx.feePerByte,
  };

  return hasFeesProvided ? { ...liveTx, feesStrategy: null } : liveTx;
};
