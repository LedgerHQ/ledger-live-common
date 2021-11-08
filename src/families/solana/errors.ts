import { createCustomErrorClass } from "@ledgerhq/errors";

// TODO: rename to wallet ?
export const SolanaMainAccountNotFunded = createCustomErrorClass(
  "SolanaAccountNotFunded"
);

export const SolanaNotEnoughBalanceToPayFees = createCustomErrorClass(
  "SolanaNotEnoughBalanceToPayFees"
);

export const SolanaAssociatedTokenAccountWillBeFunded = createCustomErrorClass(
  "SolanaAssociatedTokenAccountWillBeFunded"
);

export const SolanaMemoIsTooLong = createCustomErrorClass(
  "SolanaMemoIsTooLong"
);

export const SolanaAmountNotTransferableIn1Tx = createCustomErrorClass(
  "SolanaAmountNotTransferableIn1Tx"
);

export const SolanaTokenAccountHoldsAnotherToken = createCustomErrorClass(
  "SolanaTokenAccountHoldsAnotherToken"
);

export const SolanaAddressOffEd25519 = createCustomErrorClass(
  "SolanaAddressOfEd25519"
);
