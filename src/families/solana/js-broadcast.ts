import { patchOperationWithHash } from "../../operation";
import type { Operation, SignedOperation } from "../../types";
import { broadcastTransaction } from "./api";

/**
 * Broadcast a signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  signedOperation,
}: {
  signedOperation: SignedOperation;
}): Promise<Operation> => {
  const { signature, operation } = signedOperation;
  const txId = await broadcastTransaction(Buffer.from(signature, "hex"));
  return patchOperationWithHash(operation, txId);
};

export default broadcast;
