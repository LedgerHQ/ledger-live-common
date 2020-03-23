// @flow

import { patchOperationWithHash } from "../../operation";
import { makeBroadcast } from "../../libcore/broadcast";

async function broadcast({
  core,
  coreAccount,
  signedOperation: { signature, operation },
}) {
  const bitcoinLikeAccount = core.CoreBitcoinLikeAccount.fromCoreAccount(
    coreAccount
  );
  const txHash = await bitcoinLikeAccount.broadcastRawTransaction(signature);
  return patchOperationWithHash(operation, txHash);
}

export default makeBroadcast({ broadcast });
