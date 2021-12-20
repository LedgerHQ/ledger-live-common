import { BigNumber } from "bignumber.js";

import type { AccountBridge, CurrencyBridge } from "../../../types";
import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";

import type { AlgorandTransaction } from "../types";
import { sync, scanAccounts } from "../js-synchronization";
import { prepareTransaction } from "../js-prepareTransaction";
import { estimateMaxSpendable } from "../js-estimateMaxSpendable";
import { getTransactionStatus } from "../js-getTransactionStatus";
import { signOperation } from "../js-signOperation";
import { broadcast } from "../js-broadcast";

const receive = makeAccountBridgeReceive();

const createTransaction = (): AlgorandTransaction => ({
  family: "algorand",
  amount: new BigNumber(0),
  fees: null,
  recipient: "",
  useAllAmount: false,
  memo: null,
  mode: "send",
  assetId: null,
});

const updateTransaction = (t, patch) => {
  return { ...t, ...patch };
};

const preload = async () => Promise.resolve({});

const hydrate = () => {};

const currencyBridge: CurrencyBridge = {
  preload,
  hydrate,
  scanAccounts,
};

const accountBridge: AccountBridge<AlgorandTransaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  sync,
  receive,
  signOperation,
  broadcast,
  estimateMaxSpendable,
};

export default {
  currencyBridge,
  accountBridge,
};
