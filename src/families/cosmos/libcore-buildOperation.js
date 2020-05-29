// @flow

import type { Operation } from "../../types";
import type { CoreOperation } from "../../libcore/types";

async function translateExtraDelegateInfo(
  msg: CosmosMessage
): CosmosDelegateTxInfo {
  const delegateMsg = await CosmosLikeMessage.unwrapMsgDelegate(msg);
  return {
    validators: [
      {
        address: delegateMsg.validatorAddress,
        amount: delegateMsg.amount.toBigNumber(),
      },
    ],
  };
}

async function translateExtraRedelegateInfo(
  msg: CosmosMessage
): CosmosRedelegateTxInfo {
  const redelegateMsg = await CosmosLikeMessage.unwrapMsgRedegelate(msg);
  return {
    validator: {
      address: redelegateMsg.validatorDstAddress,
      amount: redelegateMsg.amount.toBigNumber(),
    },
    cosmosSourceValidator: redelegateMsg.validatorSrcAddress,
  };
}

async function translateExtraUndelegateInfo(
  msg: CosmosMessage
): CosmosUndelegateTxInfo {
  const undelegateMsg = await CosmosLikeMessage.unwrapMsgUndelegate(msg);
  return {
    validator: {
      address: undelegateMsg.validatorAddress,
      amount: undelegateMsg.amount.toBigNumber(),
    },
  };
}

async function translateExtraRewardInfo(
  msg: CosmosMessage
): CosmosClaimRewardsTxInfo {
  const rewardMsg = await CosmosLikeMessage.unwrapMsgWithdrawDelegationReward(
    msg
  );
  return {
    validator: {
      address: rewardMsg.validatorAddress,
      amount: 0, // 0 because it's unknown
    },
  };
}

async function cosmosBuildOperation({
  coreOperation,
}: {
  coreOperation: CoreOperation,
}) {
  const cosmosLikeOperation = await coreOperation.asCosmosLikeOperation();
  const cosmosLikeTransaction = await cosmosLikeOperation.getTransaction();
  const hash = await cosmosLikeTransaction.getHash();
  const message = await cosmosLikeOperation.getMessage();
  const out: $Shape<Operation> = {
    hash: `${hash}-${await message.getIndex()}`,
  };

  switch (await message.getRawMessageType()) {
    case "internal/MsgFees":
      out.type = "FEES";
      break;

    case "cosmos-sdk/MsgDelegate":
      out.type = "DELEGATE";
      out.extra = translateExtraDelegateInfo(message);
      break;

    case "cosmos-sdk/MsgUndelegate":
      out.type = "UNDELEGATE";
      out.extra = translateExtraUndelegateInfo(message);
      break;

    case "cosmos-sdk/MsgWithdrawDelegationReward":
      out.type = "REWARD";
      out.extra = translateExtraRewardInfo(message);
      break;

    case "cosmos-sdk/MsgBeginRedelegate":
      out.type = "REDELEGATE";
      out.extra = translateExtraRedelegateInfo(message);
      break;
  }

  return out;
}

export default cosmosBuildOperation;
