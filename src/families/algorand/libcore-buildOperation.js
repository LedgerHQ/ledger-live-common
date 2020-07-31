// @flow

import type { CoreOperation } from "../../libcore/types";
import type { Operation } from "../../types";

const getAssetId = async (transaction) => {
  if ((await transaction.getType()) === "axfer") {
    const assetInfo = await transaction.getAssetTransferInfo();
    return assetInfo.getAssetId();
  }
  return null;
};

const getOperationType = async (algorandOperation) => {
  const operationType = await algorandOperation.getAlgorandOperationType();
  let type;

  if (operationType === 7) {
    type = "OPT_IN";
  }

  if (operationType === 8) {
    type = "OPT_OUT";
  }

  return type;
};

async function algorandBuildOperation({
  coreOperation,
}: {
  coreOperation: CoreOperation,
}) {
  const algorandLikeOperation = await coreOperation.asAlgorandOperation();
  const algorandLikeTransaction = await algorandLikeOperation.getTransaction();
  const hash = await algorandLikeTransaction.getId();

  const out: $Shape<Operation> = {
    hash,
  };

  const type = await getOperationType(algorandLikeOperation);
  if (type) {
    out.type = type;
  }

  const assetId = await getAssetId(algorandLikeTransaction);
  if (assetId) {
    out.extra = { ...out.extra, assetId: assetId };
  }

  return out;
}

export default algorandBuildOperation;
