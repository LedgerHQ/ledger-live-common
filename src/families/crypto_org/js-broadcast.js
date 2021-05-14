// @flow
import type { Operation, SignedOperation } from "../../types";
import { patchOperationWithHash } from "../../operation";

import { submit } from "./api";
import { CryptoOrgErrorBroadcasting } from "./errors";

function isBroadcastTxFailure(result) {
  return !!result.code;
}

/**
 * Broadcast the signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  signedOperation: { signature, operation },
}: {
  signedOperation: SignedOperation,
}): Promise<Operation> => {
  const broadcastResponse = await submit(signature);

  if (isBroadcastTxFailure(broadcastResponse)) {
    throw new CryptoOrgErrorBroadcasting();
  }

  return patchOperationWithHash(operation, broadcastResponse.transactionHash);
};

export default broadcast;
