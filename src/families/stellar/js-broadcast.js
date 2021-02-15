// @flow
import { patchOperationWithHash } from "../../../operation";
import type {
  Operation,
  SignedOperation,
} from "../../../types";
//import { broadcastTransaction as apiBroadcast } from "../api"; // TODO:

/**
 * Broadcast a signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  signedOperation: { signature, operation },
}: {
  signedOperation: SignedOperation,
}): Promise<Operation> => {
  // TODO: Implement broadcastTransaction in api.js
  //const hash = await apiBroadcast(signature);
  const hash = ""; 

  return patchOperationWithHash(operation, hash);
};

export default broadcast;
