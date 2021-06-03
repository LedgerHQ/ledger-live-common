// @flow
import type { Operation, SignedOperation, Account } from "../../types";
import { patchOperationWithHash } from "../../operation";

import { broadcastTransaction } from "./api";
import { CryptoOrgErrorBroadcasting } from "./errors";
import { TESTNET_CURRENCY_ID } from "./logic";

function isBroadcastTxFailure(result) {
  return !!result.code;
}

/**
 * Broadcast the signed transaction
 */
const broadcast = async ({
  account,
  signedOperation: { signature, operation },
}: {
  account: Account,
  signedOperation: SignedOperation,
}): Promise<Operation> => {
  const useTestNet = account.currency.id == TESTNET_CURRENCY_ID ? true : false;
  const broadcastResponse = await broadcastTransaction(signature, useTestNet);

  if (isBroadcastTxFailure(broadcastResponse)) {
    throw new CryptoOrgErrorBroadcasting();
  }

  return patchOperationWithHash(operation, broadcastResponse.transactionHash);
};

export default broadcast;
