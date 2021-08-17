import { BigNumber } from "bignumber.js";
import flatMap from "lodash/flatMap";
import { CurrencyNotSupported } from "@ledgerhq/errors";

import type { Account, TransactionStatus } from "../../../types";
import type { Transaction } from "../types";
import type { CurrencyBridge, AccountBridge } from "../../../types/bridge";
import { parseCurrencyUnit } from "../../../currencies";
import {
  makeSync,
  makeScanAccounts,
  GetAccountShape,
} from "../../../bridge/jsHelpers";
import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";
import { getUnit, mapTxToOps } from "./utils";
import { fetchBalances, fetchBlockHeight, fetchTxs } from "./api";

const receive = makeAccountBridgeReceive();

const getAccountShape: GetAccountShape = async (info) => {
  const { address } = info;

  const blockHeight = await fetchBlockHeight();
  const balance = await fetchBalances(address);
  const txs = await fetchTxs(address);

  return {
    balance: parseCurrencyUnit(getUnit(), String(balance.total_balance)),
    operations: flatMap(txs, mapTxToOps(info)),
    blockHeight: blockHeight.current_block_identifier.index,
  };
};

const scanAccounts = makeScanAccounts(getAccountShape);
const sync = makeSync(getAccountShape);
const currencyBridge: CurrencyBridge = {
  preload: () => Promise.resolve({}),
  hydrate: () => {},
  scanAccounts,
};

const createTransaction = (a: Account): Transaction => {
  throw new CurrencyNotSupported("filecoin currency not supported", {
    currencyName: a.currency.name,
  });
};

const updateTransaction = (
  t: Transaction,
  patch: Transaction
): Transaction => ({ ...t, ...patch });

const getTransactionStatus = (a: Account): Promise<TransactionStatus> =>
  Promise.reject(
    new CurrencyNotSupported("filecoin currency not supported", {
      currencyName: a.currency.name,
    })
  );

const estimateMaxSpendable = (): Promise<BigNumber> =>
  Promise.reject(new Error("estimateMaxSpendable not implemented"));

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> =>
  Promise.resolve(t);

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  estimateMaxSpendable,
  sync,
  receive,
  signOperation: () => {
    throw new Error("signOperation not implemented");
  },
  broadcast: () => {
    throw new Error("broadcast not implemented");
  },
};
export default {
  currencyBridge,
  accountBridge,
};
