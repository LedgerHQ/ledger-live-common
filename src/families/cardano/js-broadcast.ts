import type { Operation, SignedOperation } from "../../types";
import { patchOperationWithHash } from "../../operation";
import { submitTransaction } from "./api/submitTransaction";

/**
 * Broadcast the signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  signedOperation,
}: {
  signedOperation: SignedOperation;
}): Promise<Operation> => {
  const trx = signedOperation.signatureRaw as { hash: string; payload: string };
  const pendingTransaction = await submitTransaction({
    hash: trx.hash,
    transaction: trx.payload,
  });

  return patchOperationWithHash(
    signedOperation.operation,
    pendingTransaction.hash
  );
};

export default broadcast;
