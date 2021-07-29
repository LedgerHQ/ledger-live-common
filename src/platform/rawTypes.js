// @flow
import type { SignedOperationRaw } from "../types";

export type {
  RawAccount as RawPlatformAccount,
  RawTransaction as RawPlatformTransaction,
} from "ledger-live-platform-sdk";

export type RawPlatformSignedTransaction = SignedOperationRaw;
