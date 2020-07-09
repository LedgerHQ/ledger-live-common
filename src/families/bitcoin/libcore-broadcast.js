// @flow

import { patchOperationWithHash } from "../../operation";
import { makeBroadcast } from "../../libcore/broadcast";
import invariant from "invariant";

async function broadcast({
  core,
  coreAccount,
  signedOperation: { signature, operation },
}) {
  const bitcoinLikeAccount = core.Bitcoin.fromCoreAccount(
    coreAccount
  );
  invariant(bitcoinLikeAccount, "bitcoin account expected");
  const txHash = await bitcoinLikeAccount.broadcastRawTransaction(signature);
  return patchOperationWithHash(operation, txHash);
}

export default makeBroadcast({ broadcast });
