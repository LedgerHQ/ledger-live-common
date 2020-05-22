// @flow
import type { Operation } from "../../types";
import type { CosmosBroadcastResponse } from "./types";
import { makeBroadcast } from "../../libcore/broadcast";
import { patchOperationWithHash } from "../../operation";
import { CosmosBroadcastError } from "../../errors";

async function broadcast({
  coreAccount,
  signedOperation: { operation, signature },
}): Promise<Operation> {
  const cosmosLikeAccount = await coreAccount.asCosmosLikeAccount();
  const res = await cosmosLikeAccount.broadcastRawTransaction(signature);
  const parsed: CosmosBroadcastResponse = JSON.parse(res);
  if (parsed.code) {
    throw new CosmosBroadcastError[parsed.code]();
  }
  return patchOperationWithHash(operation, parsed.txhash);
}

export default makeBroadcast({ broadcast });
