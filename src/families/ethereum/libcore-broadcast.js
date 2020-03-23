// @flow
import { makeBroadcast } from "../../libcore/broadcast";
import { patchOperationWithHash } from "../../operation";
import invariant from "invariant";

async function broadcast({
  core,
  coreAccount,
  signedOperation: { operation, signature },
}) {
  const ethereumLikeAccount = core.CoreEthereumLikeAccount.fromCoreAccount(
    coreAccount
  );
  invariant(ethereumLikeAccount, "ethereum account expected");
  const txHash = await ethereumLikeAccount.broadcastRawTransaction(signature);
  return patchOperationWithHash(operation, txHash);
}

export default makeBroadcast({
  broadcast,
});
