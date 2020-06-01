// @flow

import type { Operation } from "../../types";
import type { Core, CoreOperation } from "../../libcore/types";
import type {
  CosmosMessage,
  CosmosDelegateTxInfo,
  CosmosRedelegateTxInfo,
  CosmosUndelegateTxInfo,
} from "./types";
import { BigNumber } from "bignumber.js";

const translateExtraDelegateInfo = async (
  core,
  msg: CosmosMessage
): Promise<CosmosDelegateTxInfo> => {
  const delegateMsg = await core.CosmosLikeMessage.unwrapMsgDelegate(msg);
  return {
    validators: [
      {
        address: await delegateMsg.getValidatorAddress(),
        amount: BigNumber(await delegateMsg.getAmount()),
      },
    ],
  };
};

async function translateExtraRedelegateInfo(
  core,
  msg: CosmosMessage
): Promise<CosmosRedelegateTxInfo> {
  const redelegateMsg = await core.CosmosLikeMessage.unwrapMsgBeginRedelegate(
    msg
  );
  return {
    validators: [
      {
        address: await redelegateMsg.getValidatorDestinationAddress(),
        amount: BigNumber(await redelegateMsg.getAmount()),
      },
    ],
    cosmosSourceValidator: "",
  };
}

async function translateExtraUndelegateInfo(
  core,
  msg: CosmosMessage
): Promise<CosmosUndelegateTxInfo> {
  const undelegateMsg = await core.CosmosLikeMessage.unwrapMsgUndelegate(msg);
  return {
    validators: [
      {
        address: await undelegateMsg.getValidatorAddress(),
        amount: BigNumber(await undelegateMsg.getAmount()),
      },
    ],
  };
}

async function translateExtraRewardInfo(
  core,
  msg: CosmosMessage
): Promise<CosmosDelegateTxInfo> {
  const rewardMsg = await core.CosmosLikeMessage.unwrapMsgWithdrawDelegationReward(
    msg
  );
  return {
    validators: [
      {
        address: rewardMsg.validatorAddress,
        amount: BigNumber(0),
      },
    ],
  };
}

async function cosmosBuildOperation({
  core,
  coreOperation,
}: {
  core: Core,
  coreOperation: CoreOperation,
}) {
  const cosmosLikeOperation = await coreOperation.asCosmosLikeOperation();
  const cosmosLikeTransaction = await cosmosLikeOperation.getTransaction();
  const hash = await cosmosLikeTransaction.getHash();
  const message = await cosmosLikeOperation.getMessage();
  const out: $Shape<Operation> = {
    hash: `${hash}`,
  };

  switch (await message.getRawMessageType()) {
    case "internal/MsgFees":
      out.type = "FEES";
      break;

    case "cosmos-sdk/MsgDelegate":
      out.type = "DELEGATE";
      out.extra = await translateExtraDelegateInfo(core, message);
      break;

    case "cosmos-sdk/MsgUndelegate":
      out.type = "UNDELEGATE";
      out.extra = await translateExtraUndelegateInfo(core, message);
      break;

    case "cosmos-sdk/MsgWithdrawDelegationReward":
      out.type = "REWARD";
      out.extra = await translateExtraRewardInfo(core, message);
      break;

    case "cosmos-sdk/MsgBeginRedelegate":
      out.type = "REDELEGATE";
      out.extra = await translateExtraRedelegateInfo(core, message);
      break;
  }

  return out;
}

export default cosmosBuildOperation;
