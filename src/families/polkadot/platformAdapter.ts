import { PolkadotTransaction as PlatformTransaction } from "ledger-live-platform-sdk";
import { Transaction } from "./types";

export const CAN_EDIT_FEES = false;

export const convertToLiveTransaction = (
  tx: PlatformTransaction
): Partial<Transaction> => ({
  ...tx,
  era: `${tx.era}`,
});
