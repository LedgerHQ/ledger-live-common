import { patchOperationWithHash } from "./../../operation";
import type { Account, Operation, SignedOperation } from "./../../types";
import wallet from "./wallet-btc";

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
  const { signature, operation } = signedOperation;
  const walletData = account.bitcoinResources?.serializedData;
  if (!walletData) {
    throw new Error("bitcoin wallet account expected");
  }
  const walletAccount = await wallet.importFromSerializedAccount(walletData);
  try {
    const hash = await wallet.broadcastTx(walletAccount, signature);
    return patchOperationWithHash(operation, hash);
  } catch (error: any) {
    throw new Error(error); // TODO Improve error message for broadcast failure cases
  }
};

export default broadcast;
