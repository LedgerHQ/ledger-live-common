import { Account } from "../../types";
import { Transaction } from "./types";
import { getAccount } from "./api/Cosmos";
import { encodePubkey, makeAuthInfoBytes } from "@cosmjs/proto-signing";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import BigNumber from "bignumber.js";

const buildTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<any> => {
  const defaultGas = new BigNumber(60000);
  const defaultFees = new BigNumber(2500);

  const { sequence } = await getAccount(account.freshAddress);

  const pubkey = encodePubkey({
    type: "tendermint/PubKeySecp256k1",
    value: Buffer.from(account.seedIdentifier, "hex").toString("base64"),
  });

  const msg: Array<{ typeUrl: string; value: any }> = [];

  switch (transaction.mode) {
    case "send":
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
      break;

    case "delegate":
      transaction.validators.forEach((validator) => {
        msg.push({
          typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
          value: {
            delegatorAddress: account.freshAddress,
            validatorAddress: validator.address,
            amount: [
              {
                denom: account.currency.units[1].code,
                amount: validator.amount.toString(),
              },
            ],
          },
        });
      });
      break;

    case "undelegate":
      msg.push({
        typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
        value: {
          delegatorAddress: account.freshAddress,
          validatorAddress: transaction.validators[0].address,
          amount: [
            {
              denom: account.currency.units[1].code,
              amount: transaction.validators[0].amount.toString(),
            },
          ],
        },
      });
      break;

    case "redelegate":
      msg.push({
        typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
        value: {
          validatorSrcAddress: transaction.cosmosSourceValidator,
          delegatorAddress: account.freshAddress,
          validatorAddress: transaction.validators[0].address,
          amount: [
            {
              denom: account.currency.units[1].code,
              amount: transaction.validators[0].amount.toString(),
            },
          ],
        },
      });
      break;

    case "claimReward":
      msg.push({
        typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
        value: {
          delegatorAddress: account.freshAddress,
          validatorAddress: transaction.validators[0].address,
        },
      });
      break;

    case "claimRewardCompound":
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
          amount: [
            {
              denom: account.currency.units[1].code,
              amount: transaction.validators[0].amount.toString(),
            },
          ],
        },
      });
      break;
  }

  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey, sequence }],
    [
      {
        amount: transaction.fees?.toString() || defaultFees.toString(),
        denom: account.currency.units[1].code,
      },
    ],
    transaction.gas?.toNumber() || defaultGas.toNumber(),
    SignMode.SIGN_MODE_LEGACY_AMINO_JSON
  );

  return {
    messages: msg,
    auth: authInfoBytes,
  };
};

export default buildTransaction;
