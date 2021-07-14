// @flow
import { createCustomErrorClass } from "@ledgerhq/errors";

/**
 * Elrond error thrown on a specifc check done on a transaction recipient and sender address
 */
export const ElrondSelfTransactionError = createCustomErrorClass(
  "ElrondSelfTransactionError"
);
