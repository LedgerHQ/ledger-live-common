import { Account } from "../../types";
import { Transaction } from "./types";
import BigNumber from "bignumber.js";
import { simulate } from "./api/Cosmos";
import { Registry, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  MsgDelegate,
  MsgUndelegate,
  MsgBeginRedelegate,
} from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { getEnv } from "../../env";
import buildTransaction from "./js-buildTransaction";
import { getMaxEstimatedBalance } from "./logic";

const prepareTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<Transaction> => {
  if (transaction.useAllAmount) {
    transaction.amount = getMaxEstimatedBalance(
      account,
      account.balance
        .dividedBy(new BigNumber(getEnv("COSMOS_GAS_AMPLIFIER")))
        .integerValue(BigNumber.ROUND_CEIL)
    );
  }

  if (transaction.mode !== "send" && !transaction.memo) {
    transaction.memo = "Ledger Live";
  }

  const unsignedPayload = await buildTransaction(account, transaction);

  // be sure payload is complete
  if (!unsignedPayload.isComplete) return transaction;

  const txBodyFields: TxBodyEncodeObject = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: unsignedPayload.messages,
    },
  };

  const registry = new Registry([
    ["/cosmos.staking.v1beta1.MsgDelegate", MsgDelegate],
    ["/cosmos.staking.v1beta1.MsgUndelegate", MsgUndelegate],
    ["/cosmos.staking.v1beta1.MsgBeginRedelegate", MsgBeginRedelegate],
    [
      "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
      MsgWithdrawDelegatorReward,
    ],
  ]);

  const txBodyBytes = registry.encode(txBodyFields);

  const txRaw = TxRaw.fromPartial({
    bodyBytes: txBodyBytes,
    authInfoBytes: unsignedPayload.auth,
    signatures: [new Uint8Array(Buffer.from(account.seedIdentifier, "hex"))],
  });

  const tx_bytes = Array.from(Uint8Array.from(TxRaw.encode(txRaw).finish()));

  const simulation = await simulate(tx_bytes);

  const gasPrice = new BigNumber(getEnv("COSMOS_GAS_PRICE"));

  transaction.gas = new BigNumber(simulation?.gas_info?.gas_used)
    .multipliedBy(new BigNumber(getEnv("COSMOS_GAS_AMPLIFIER")))
    .integerValue(BigNumber.ROUND_CEIL);

  transaction.fees = gasPrice
    .multipliedBy(transaction.gas)
    .integerValue(BigNumber.ROUND_CEIL);

  return transaction;
};

export default prepareTransaction;
