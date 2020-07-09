// @flow
import type { Operation } from "../../types";
import { makeBroadcast } from "../../libcore/broadcast";
import { patchOperationWithHash } from "../../operation";
import invariant from "invariant";

async function broadcast({
  core,
  coreAccount,
  signedOperation: { operation, signature },
}): Promise<Operation> {
  const tezosLikeAccount = core.Tezos.fromCoreAccount(coreAccount);
  invariant(tezosLikeAccount, "tezos account expected");
  const hash = await tezosLikeAccount.broadcastRawTransaction(signature);
  return patchOperationWithHash(operation, hash);
}

export default makeBroadcast({ broadcast });
