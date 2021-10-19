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
  const txSignature = await broadcastTransaction(Buffer.from(signature, "hex"));
  const txHash = txSignature;
  return patchOperationWithHash(operation, txHash);
};

export default broadcast;
