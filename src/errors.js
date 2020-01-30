// @flow
import { createCustomErrorClass } from "@ledgerhq/errors";

// TODO we need to migrate in all errors that are in @ledgerhq/errors
// but only make sense to live-common to not pollute ledgerjs

export const TransactionRefusedOnDevice = createCustomErrorClass(
  "TransactionRefusedOnDevice"
);

export const ModeNotSupported = createCustomErrorClass("ModeNotSupported");

export const ResourceNotSupported = createCustomErrorClass(
  "ResourceNotSupported"
);

export const UnfreezeNotExpired = createCustomErrorClass("UnfreezeNotExpired");

export const VoteRequired = createCustomErrorClass("VoteRequired");

export const InvalidVoteCount = createCustomErrorClass("InvalidVoteCount");

export const RewardNotAvailable = createCustomErrorClass("RewardNotAvailable");

export const InvalidFreezeAmount = createCustomErrorClass("InvalidFreezeAmount");
