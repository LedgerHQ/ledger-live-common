import type { Operation, SignedOperation } from "../../types";
import { patchOperationWithHash } from "../../operation";
import { submitTransaction } from "./api/submitTransaction";

/**
 * Broadcast the signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  signedOperation: { operation, signatureRaw },
}: {
  signedOperation: SignedOperation;
}): Promise<Operation> => {
  const trx = signatureRaw as { hash: string; payload: string };
  const pendingTransaction = await submitTransaction(trx.hash, trx.payload);

  return patchOperationWithHash(operation, pendingTransaction.hash);
};

export default broadcast;
