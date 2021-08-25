import { PolkadotTransaction as PlatformTransaction } from "@ledgerhq/live-app-sdk";
import { PolkadotOperationMode, Transaction } from "./types";

export const CAN_EDIT_FEES = false;

export const convertToLiveTransaction = (
  tx: PlatformTransaction
): Partial<Transaction> => ({
  ...tx,
  era: `${tx.era}`,
  mode: tx.mode as PolkadotOperationMode, // FIXME: update SDK polkadot transaction type to include a PolkadotOperationMode type
});
