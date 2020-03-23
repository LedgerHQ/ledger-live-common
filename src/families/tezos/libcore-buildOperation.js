// @flow

import type { Operation } from "../../types";
import type { Core, CoreOperation } from "../../libcore/types";
import { tezosOperationTag } from "./types";
import invariant from "invariant";

const opTagToType = {
  [tezosOperationTag.OPERATION_TAG_REVEAL]: "REVEAL",
  [tezosOperationTag.OPERATION_TAG_ORIGINATION]: "CREATE",
  [tezosOperationTag.OPERATION_TAG_DELEGATION]: "DELEGATE",
};

async function tezosBuildOperation(
  {
    core,
    coreOperation
  }: {
    core: Core,
    coreOperation: CoreOperation
  },
  partialOp: $Shape<Operation>
) {
  const tezosLikeOperation = core.CoreTezosLikeOperation.fromCoreOperation(
    coreOperation
  );
  invariant(tezosLikeOperation, "tezos operation expected");
  const tezosLikeTransaction = await tezosLikeOperation.getTransaction();
  const status = await tezosLikeTransaction.getStatus();
  const tezosType = await tezosLikeTransaction.getType();
  const hash = await tezosLikeTransaction.getHash();
  const out: $Shape<Operation> = { hash };
  let maybeCustomType = opTagToType[tezosType];
  if (maybeCustomType === "DELEGATE" && !partialOp.recipients[0]) {
    maybeCustomType = "UNDELEGATE";
  }
  if (maybeCustomType === "IN" && partialOp.value.eq(0)) {
    maybeCustomType = "NONE";
  }
  if (maybeCustomType) {
    out.type = maybeCustomType;
  }
  if (status === 0) {
    out.hasFailed = true;
  }
  return out;
}

export default tezosBuildOperation;
