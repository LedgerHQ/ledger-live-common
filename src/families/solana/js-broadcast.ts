import { patchOperationWithHash } from "../../operation";
import type { Account, Operation, SignedOperation } from "../../types";
import { broadcastTransaction, Config } from "./api";
import { clusterByCurrencyId } from "./utils";

/**
 * Broadcast a signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  account,
  signedOperation,
}: {
  account: Account;
  signedOperation: SignedOperation;
}): Promise<Operation> => {
  const config: Config = {
    cluster: clusterByCurrencyId(account.currency.id),
  };

  const { signature, operation } = signedOperation;
  const txSignature = await broadcastTransaction(
    Buffer.from(signature, "hex"),
    config
  );
  const txHash = txSignature;
  return patchOperationWithHash(operation, txHash);
};

export default broadcast;
