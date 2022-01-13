import { Account } from "../../types";
import { Transaction } from "./types";
import BigNumber from "bignumber.js";
import { simulate } from "./api/Cosmos";
import { Registry, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { getEnv } from "../../env";
import buildTransaction from "./js-buildTransaction";

const prepareTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<Transaction> => {
  const unsignedPayload = await buildTransaction(account, transaction);

  const txBodyFields: TxBodyEncodeObject = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: unsignedPayload.messages,
    },
  };

  const registry = new Registry();

  const txBodyBytes = registry.encode(txBodyFields);

  const txRaw = TxRaw.fromPartial({
    bodyBytes: txBodyBytes,
    authInfoBytes: unsignedPayload.auth,
    signatures: [new Uint8Array(Buffer.from(account.seedIdentifier, "hex"))],
  });

  const tx_bytes = Array.from(Uint8Array.from(TxRaw.encode(txRaw).finish()));

  const simulation = await simulate(tx_bytes);

  const gasPrice = new BigNumber(getEnv("COSMOS_GAS_PRICE"));

  transaction.gas = new BigNumber(simulation.gas_info.gas_used).multipliedBy(
    getEnv("COSMOS_GAS_AMPLIFIER")
  );

  transaction.fees = gasPrice
    .multipliedBy(transaction.gas)
    .integerValue(BigNumber.ROUND_CEIL);

  if (transaction.mode !== "send" && !transaction.memo) {
    transaction.memo = "Ledger Live";
  }

  return transaction;
};

export default prepareTransaction;
