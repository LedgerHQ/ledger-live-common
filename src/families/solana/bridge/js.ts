import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";
import type { AccountBridge, CurrencyBridge } from "../../../types";
import type { Transaction } from "../types";
import { scanAccounts, sync } from "../js-synchronization";
import getTransactionStatus from "../js-getTransactionStatus";
import estimateMaxSpendable from "../js-estimateMaxSpendable";
import createTransaction, { updateTransaction } from "../js-createTransaction";
import prepareTransaction from "../js-prepareTransaction";
import signOperation from "../js-signOperation";
import broadcast from "../js-broadcast";

const preload = async (): Promise<any> => {};

const hydrate = (): void => {};

const receive = makeAccountBridgeReceive();

const currencyBridge: CurrencyBridge = {
  preload,
  hydrate,
  scanAccounts,
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  estimateMaxSpendable,
  getTransactionStatus,
  sync,
  receive,
  signOperation,
  broadcast,
};

export default {
  currencyBridge,
  accountBridge,
};
