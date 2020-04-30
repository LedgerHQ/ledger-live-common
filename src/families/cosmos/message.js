// @flow

import type { Transaction, CosmosMessage } from "./types";
import type { Core } from "../../libcore/types";

export const cosmosCreateMessage = async (
  freshAddress: string,
  transaction: Transaction,
  core: Core
): Promise<CosmosMessage[]> => {
  const { recipient } = transaction;
  switch (transaction.mode) {
    case "send":
      return [
        await core.CosmosLikeMessage.wrapMsgSend({
          fromAddress: freshAddress,
          toAddress: recipient,
          amount: [{ amount: transaction.amount.toString(), denom: "uatom" }]
        })
      ];

    case "delegate": {
      const { validators } = transaction;
      if (!validators || validators.length === 0) {
        throw new Error("no validators");
      }
      return await Promise.all(
        validators.map<Promise<CosmosMessage>>(
          async validator =>
            await core.CosmosLikeMessage.wrapMsgDelegate({
              delegatorAddress: freshAddress,
              validatorAddress: validator.address,
              amount: { amount: validator.amount.toString(), denom: "uatom" }
            })
        )
      );
    }

    case "undelegate":
      return [
        await core.CosmosLikeMessage.wrapMsgUndelegate({
          delegatorAddress: freshAddress,
          validatorAddress: recipient,
          amount: { amount: transaction.amount.toString(), denom: "uatom" }
        })
      ];

    case "redelegate": {
      const { cosmosSourceValidator } = transaction;
      if (!cosmosSourceValidator) {
        throw new Error("source validator is empty");
      }
      return [
        await core.CosmosLikeMessage.wrapMsgBeginRedelegate({
          delegatorAddress: freshAddress,
          validatorSourceAddress: cosmosSourceValidator,
          validatorDestinationAddress: recipient,
          amount: { amount: transaction.amount.toString(), denom: "uatom" }
        })
      ];
    }

    case "claimReward": {
      return [
        await core.CosmosLikeMessage.wrapMsgWithdrawDelegationReward({
          delegatorAddress: freshAddress,
          validatorAddress: recipient
        })
      ];
    }
  }
  throw new Error("unknown message");
};
