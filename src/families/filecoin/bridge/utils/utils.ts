import { Operation } from "../../../../types";
import {
  getCryptoCurrencyById,
  parseCurrencyUnit,
} from "../../../../currencies";
import { BigNumber } from "bignumber.js";
import { TransactionResponse } from "./types";
import {
  GetAccountShape,
  GetAccountShapeArg0,
} from "../../../../bridge/jsHelpers";
import { fetchBalances, fetchBlockHeight, fetchTxs } from "./api";
import flatMap from "lodash/flatMap";
import fs from "fs";

export const getUnit = () => getCryptoCurrencyById("filecoin").units[0];

export const mapTxToOps =
  ({ id, address }: GetAccountShapeArg0) =>
  (tx: TransactionResponse): Operation[] => {
    const { to, from, hash, timestamp, amount } = tx;
    const ops: Operation[] = [];
    const date = new Date(timestamp * 1000);
    const value = parseCurrencyUnit(getUnit(), amount.toString());

    const isSending = address === from;
    const isReceiving = address === to;
    const fee = new BigNumber(0);

    if (isSending) {
      ops.push({
        id: `${id}-${hash}-OUT`,
        hash,
        type: "OUT",
        value: value.plus(fee),
        fee,
        blockHeight: tx.height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date,
        extra: {},
      });
    }

    if (isReceiving) {
      ops.push({
        id: `${id}-${hash}-IN`,
        hash,
        type: "IN",
        value,
        fee,
        blockHeight: tx.height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date,
        extra: {},
      });
    }

    return ops;
  };

export const getAccountShape: GetAccountShape = async (info) => {
  const { address } = info;

  const blockHeight = await fetchBlockHeight();
  const balance = await fetchBalances(address);
  const txs = await fetchTxs(address);

  const result = {
    balance: parseCurrencyUnit(getUnit(), String(balance.total_balance)),
    operations: flatMap(txs, mapTxToOps(info)),
    blockHeight: blockHeight.current_block_identifier.index,
  };

  fs.appendFileSync("getAccountShape.log", JSON.stringify(result));
  return result;
};
