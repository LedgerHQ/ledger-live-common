// @flow
import invariant from "invariant";
import { patchOperationWithHash } from "./../../operation";
import type { Account, Operation, SignedOperation } from "./../../types";
import wallet from "./wallet";

/**
 * Broadcast a signed transaction
 * @param {signature: string, operation: string} signedOperation
 */
const broadcast = async ({
  account,
  signedOperation,
}: {
  account: Account,
  signedOperation: SignedOperation,
}): Promise<Operation> => {
  console.log("XXX - broadcast - XXX");

  const { signature, operation } = signedOperation;

  const walletData = account.bitcoinResources?.serializedData;
  invariant(walletData, "bitcoin wallet account expected");
  const walletAccount = await wallet.importFromSerializedAccount(walletData);

  const hash = await wallet.broadcastTx(walletAccount, signature);

  console.log("XXX - broadcast - hash: ", hash);

  return patchOperationWithHash(operation, hash);
};

export default broadcast;
