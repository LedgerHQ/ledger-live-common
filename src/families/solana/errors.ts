import { createCustomErrorClass } from "@ledgerhq/errors";

export const SolanaAccountNotFunded = createCustomErrorClass(
  "SolanaAccountNotFunded"
);

export const SolanaMemoIsTooLong = createCustomErrorClass(
  "SolanaMemoIsTooLong"
);

export const SolanaAddressOffEd25519 = createCustomErrorClass(
  "SolanaAddressOfEd25519"
);
