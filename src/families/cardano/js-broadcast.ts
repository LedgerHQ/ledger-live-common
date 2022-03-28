import type { BroadcastFnSignature } from "../../types";
import { patchOperationWithHash } from "../../operation";
import { submitTransaction } from "./api/submitTransaction";

/**
 * Broadcast the signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast: BroadcastFnSignature = async ({
  signedOperation,
  account,
}) => {
  const trx = signedOperation.signatureRaw as { hash: string; payload: string };
  const pendingTransaction = await submitTransaction({
    hash: trx.hash,
    transaction: trx.payload,
    currency: account.currency,
  });

  return patchOperationWithHash(
    signedOperation.operation,
    pendingTransaction.hash
  );
};

export default broadcast;
