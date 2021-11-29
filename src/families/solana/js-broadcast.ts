import { patchOperationWithHash } from "../../operation";
import type { Account, Operation, SignedOperation } from "../../types";
import { ChainAPI } from "./api/web4";

export const broadcastWithAPI = async (
  {
    account,
    signedOperation,
  }: {
    account: Account;
    signedOperation: SignedOperation;
  },
  api: ChainAPI
): Promise<Operation> => {
  const { signature, operation } = signedOperation;
  const txSignature = await api.sendRawTransaction(
    Buffer.from(signature, "hex")
  );
  const txHash = txSignature;
  return patchOperationWithHash(operation, txHash);
};
