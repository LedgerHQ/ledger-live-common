import { Account } from "../../types";
import { Transaction } from "./types";

const buildTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<any> => {
  const msg: Array<{ typeUrl: string; value: any }> = [];

  // Ledger Live is able to build transaction atomically,
  // Take care expected data are complete before push msg.
  // Otherwise, the transaction is silently returned intact.

  let isComplete = true;

  switch (transaction.mode) {
    case "send":
      if (!transaction.recipient || transaction.amount.lte(0)) {
        isComplete = false;
      } else {
        msg.push({
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: account.freshAddress,
            toAddress: transaction.recipient,
            amount: [
              {
                denom: account.currency.units[1].code,
                amount: transaction.amount.toString(),
              },
            ],
          },
        });
      }
      break;

    case "delegate":
      if (!transaction.validators || transaction.validators.length < 1) {
        isComplete = false;
      } else {
        transaction.validators.forEach((validator) => {
          if (!validator.address || validator.amount.lte(0)) {
            isComplete = false;
          }

          msg.push({
            typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
            value: {
              delegatorAddress: account.freshAddress,
              validatorAddress: validator.address,
              amount: {
                denom: account.currency.units[1].code,
                amount: validator.amount.toString(),
              },
            },
          });
        });
      }
      break;

    case "undelegate":
      if (
        !transaction.validators ||
        transaction.validators.length < 1 ||
        !transaction.validators[0].address ||
        transaction.validators[0].amount.lte(0)
      ) {
        isComplete = false;
      } else {
        msg.push({
          typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
          value: {
            delegatorAddress: account.freshAddress,
            validatorAddress: transaction.validators[0].address,
            amount: {
              denom: account.currency.units[1].code,
              amount: transaction.validators[0].amount.toString(),
            },
          },
        });
      }
      break;

    case "redelegate":
      if (
        !transaction.cosmosSourceValidator ||
        !transaction.validators ||
        transaction.validators.length < 1 ||
        !transaction.validators[0].address ||
        transaction.validators[0].amount.lte(0)
      ) {
        isComplete = false;
      } else {
        msg.push({
          typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
          value: {
            validatorSrcAddress: transaction.cosmosSourceValidator,
            delegatorAddress: account.freshAddress,
            validatorDstAddress: transaction.validators[0].address,
            amount: {
              denom: account.currency.units[1].code,
              amount: transaction.validators[0].amount.toString(),
            },
          },
        });
      }
      break;

    case "claimReward":
      if (
        !transaction.validators ||
        transaction.validators.length < 1 ||
        !transaction.validators[0].address
      ) {
        isComplete = false;
      } else {
        msg.push({
          typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
          value: {
            delegatorAddress: account.freshAddress,
            validatorAddress: transaction.validators[0].address,
          },
        });
      }
      break;

    case "claimRewardCompound":
      if (
        !transaction.validators ||
        transaction.validators.length < 1 ||
        !transaction.validators[0].address ||
        transaction.validators[0].amount.lte(0)
      ) {
        isComplete = false;
      } else {
        msg.push({
          typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
          value: {
            delegatorAddress: account.freshAddress,
            validatorAddress: transaction.validators[0].address,
          },
        });

        msg.push({
          typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
          value: {
            delegatorAddress: account.freshAddress,
            validatorAddress: transaction.validators[0].address,
            amount: {
              denom: account.currency.units[1].code,
              amount: transaction.validators[0].amount.toString(),
            },
          },
        });
      }
      break;
  }

  if (!isComplete) {
    return [];
  }

  return msg;
};

export default buildTransaction;
