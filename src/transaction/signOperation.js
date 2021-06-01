// @flow
import { log } from "@ledgerhq/logs";
import type {
  SignOperationEventRaw,
  SignOperationEvent,
  SignedOperationRaw,
  SignedOperation,
} from "../types/transaction";

import { fromOperationRaw, toOperationRaw } from "../account";

export const fromSignedOperationRaw = (
  signedOp: SignedOperationRaw,
  accountId: string
): SignedOperation => {
  const { operation, signature, expirationDate, signatureRaw } = signedOp;
  const out: SignedOperation = {
    operation: fromOperationRaw(operation, accountId),
    signature,
    expirationDate: expirationDate ? new Date(expirationDate) : null,
  };
  if (signatureRaw) {
    out.signatureRaw = signatureRaw;
  }
  return out;
};

export const toSignedOperationRaw = (
  signedOp: SignedOperation,
  preserveSubOperation?: boolean
): SignedOperationRaw => {
  const { operation, signature, expirationDate, signatureRaw } = signedOp;
  const out: SignedOperationRaw = {
    operation: toOperationRaw(operation, preserveSubOperation),
    signature,
    expirationDate: expirationDate ? expirationDate.toISOString() : null,
  };
  if (signatureRaw) {
    out.signatureRaw = signatureRaw;
  }
  return out;
};

export const fromSignOperationEventRaw = (
  e: SignOperationEventRaw,
  accountId: string
): SignOperationEvent => {
  let signedOperation;
  switch (e.type) {
    case "signed":
      signedOperation = fromSignedOperationRaw(e.signedOperation, accountId);
      log(
        "transaction-summary",
        `✔️ has been signed! ${JSON.stringify(e.signedOperation)}`
      );
      return {
        type: "signed",
        signedOperation,
      };
    default:
      return e;
  }
};

export const toSignOperationEventRaw = (
  e: SignOperationEvent
): SignOperationEventRaw => {
  let signedOperation;
  switch (e.type) {
    case "signed":
      signedOperation = e.signedOperation;
      log(
        "transaction-summary",
        `✔️ has been signed! ${JSON.stringify(e.signedOperation)}`
      );
      return {
        type: "signed",
        signedOperation: toSignedOperationRaw(signedOperation, true),
      };
    default:
      return e;
  }
};
