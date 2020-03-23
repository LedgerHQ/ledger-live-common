// @flow

import type { Core, CoreOperation } from "../../libcore/types";
import invariant from "invariant";

async function bitcoinBuildOperation({
  core,
  coreOperation
}: {
  core: Core,
  coreOperation: CoreOperation
}) {
  const bitcoinLikeOperation = core.CoreBitcoinLikeOperation.fromCoreOperation(
    coreOperation
  );
  invariant(bitcoinLikeOperation, "bitcoin operation expected");
  const bitcoinLikeTransaction = await bitcoinLikeOperation.getTransaction();
  const hash = await bitcoinLikeTransaction.getHash();
  return { hash };
}

export default bitcoinBuildOperation;
