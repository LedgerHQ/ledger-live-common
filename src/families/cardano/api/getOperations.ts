import BigNumber from "bignumber.js";
import _ from "lodash";
import { Operation } from "../../../types";
import * as ApiTypes from "./api-types";
import axios from "./axios";

async function getRecentTransactions(
  paymentKeyList: Array<string>
): Promise<Array<ApiTypes.TransactionRaw>> {
  const res = await axios.get("/v1/transaction/recent", {
    params: {
      paymentKeys: paymentKeyList,
    },
  });
  return res.data.transactions;
}

export async function getOperations({
  usedPaymentKeys,
  accountId,
}: {
  usedPaymentKeys: Array<string>;
  accountId: string;
}): Promise<Array<Operation>> {
  const usedPaymentKeysChunk = _(usedPaymentKeys).chunk(30).value();
  const transactionsRes = await Promise.all(
    usedPaymentKeysChunk.map((paymentKeys) =>
      getRecentTransactions(paymentKeys)
    )
  );
  const transactions = _(transactionsRes)
    .flatten()
    .uniqBy((t) => t.hash)
    .orderBy((t) => new Date(t.timestamp), ["desc"])
    .slice(0, 10)
    .value();
  return transactions.map((t) => {
    const walletInputs = t.inputs
      .filter((i) => usedPaymentKeys.includes(i.paymentKey))
      .reduce((total, i) => total.plus(i.value), new BigNumber(0));

    const walletOutputs = t.outputs
      .filter((o) => usedPaymentKeys.includes(o.paymentKey))
      .reduce((total, o) => total.plus(o.value), new BigNumber(0));

    const walletChange = walletOutputs.minus(walletInputs.plus(t.fees));
    const transactionType = walletChange.isNegative()
      ? "OUT"
      : walletChange.isPositive()
      ? "IN"
      : "NONE";
    return {
      accountId,
      id: t.hash,
      hash: t.hash,
      type: transactionType,
      value: walletChange.plus(t.fees).absoluteValue(),
      senders: t.inputs.map((i) => i.address),
      recipients: t.outputs.map((o) => o.address),
      blockHeight: t.blockHeight,
      date: new Date(t.timestamp),
      extra: {},
      fee: new BigNumber(t.fees),
      blockHash: null,
    };
  });
}
