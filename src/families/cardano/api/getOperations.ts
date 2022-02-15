import BigNumber from "bignumber.js";
import _ from "lodash";
import { Operation, OperationType } from "../../../types";
import * as ApiTypes from "./api-types";
import { utils as TyphonUtils } from "@stricahq/typhonjs";
import network from "../../../network";
import { CARDANO_API_ENDPOINT } from "../constants";

async function getRecentTransactions(paymentKeyList: Array<string>): Promise<{
  blockHeight: number;
  transactions: Array<ApiTypes.TransactionRaw>;
}> {
  const res = await network({
    method: "GET",
    url: `${CARDANO_API_ENDPOINT}/v1/transaction/recent`,
    params: {
      paymentKeys: paymentKeyList,
    },
  });
  return {
    transactions: res.data.transactions,
    blockHeight: res.data.blockHeight,
  };
}

function getWalletChange(
  t: ApiTypes.TransactionRaw,
  usedPaymentKeys: Array<string>
): BigNumber {
  const walletInputs = t.inputs
    .filter((i) => usedPaymentKeys.includes(i.paymentKey))
    .reduce((total, i) => total.plus(i.value), new BigNumber(0));

  const walletOutputs = t.outputs
    .filter((o) => usedPaymentKeys.includes(o.paymentKey))
    .reduce((total, o) => total.plus(o.value), new BigNumber(0));

  return walletOutputs.minus(walletInputs.plus(t.fees));
}

export async function getOperations({
  usedPaymentKeys,
  accountId,
}: {
  usedPaymentKeys: Array<string>;
  accountId: string;
}): Promise<{ operations: Array<Operation>; blockHeight: number }> {
  const usedPaymentKeysChunk = _(usedPaymentKeys).chunk(30).value();
  const transactionsRes = await Promise.all(
    usedPaymentKeysChunk.map((paymentKeys) =>
      getRecentTransactions(paymentKeys)
    )
  );
  const transactionsResFlat = _(transactionsRes).flatten();

  const transactions: Array<ApiTypes.TransactionRaw> = [];
  const blockHeightList: Array<number> = [];
  transactionsResFlat.forEach((d) => {
    blockHeightList.push(d.blockHeight);
    transactions.push(...d.transactions);
  });

  const blockHeight = _(blockHeightList).max() as number;

  const operations = _(transactions)
    .uniqBy((t) => t.hash)
    .orderBy((t) => new Date(t.timestamp), ["desc"])
    .slice(0, 10)
    .map((t) => {
      const walletChange = getWalletChange(t, usedPaymentKeys);
      const operationType: OperationType = walletChange.isNegative()
        ? "OUT"
        : walletChange.isPositive()
        ? "IN"
        : "NONE";
      return {
        accountId,
        id: t.hash,
        hash: t.hash,
        type: operationType,
        value: walletChange.plus(t.fees).absoluteValue(),
        senders: t.inputs.map((i) =>
          TyphonUtils.getAddressFromHex(i.address).getBech32()
        ),
        recipients: t.outputs.map((o) =>
          TyphonUtils.getAddressFromHex(o.address).getBech32()
        ),
        blockHeight: t.blockHeight,
        date: new Date(t.timestamp),
        extra: {},
        fee: new BigNumber(t.fees),
        blockHash: null,
      };
    })
    .value();

  return { operations, blockHeight };
}
