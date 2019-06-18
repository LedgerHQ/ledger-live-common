// @flow

import type { CoreOperation } from "../../libcore/types";

async function arkBuildOperation({
  coreOperation
}: {
  coreOperation: CoreOperation
}) {
  const arkLikeOperation = await coreOperation.asArkLikeOperation();
  const arkLikeTransaction = await arkLikeOperation.getTransaction();
  const hash = await arkLikeTransaction.getHash();
  return { hash };
}

export default arkBuildOperation;
