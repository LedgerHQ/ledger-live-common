// @flow
import { patchOperationWithHash } from "../../operation";
import type {
  Operation,
  SignedOperation,
} from "../../types";
import { broadcastTransaction as apiBroadcast } from "./api";

/**
 * Broadcast a signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  signedOperation: { signature, operation },
}: {
  signedOperation: SignedOperation,
}): Promise<Operation> => {
  const hash = await apiBroadcast(signature);

  return patchOperationWithHash(operation, hash);
};

export default broadcast;
