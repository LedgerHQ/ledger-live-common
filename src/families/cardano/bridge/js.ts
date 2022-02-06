import type { Transaction } from "../types";
import type { AccountBridge, CurrencyBridge } from "../../../types";
import { makeAccountBridgeReceive } from "../../../bridge/mockHelpers";
import { scanAccounts, sync } from "../js-synchronisation";
import estimateMaxSpendable from "../js-estimateMaxSpendable";
import {
  createTransaction,
  prepareTransaction,
  updateTransaction,
} from "../js-transaction";
import getTransactionStatus from "../js-getTransactionStatus";
import signOperation from "../js-signOperation";
import broadcast from "../js-broadcast";

const receive = makeAccountBridgeReceive();

const accountBridge: AccountBridge<Transaction> = {
  estimateMaxSpendable,
  createTransaction,
  updateTransaction,
  getTransactionStatus,
  prepareTransaction,
  sync,
  receive,
  signOperation,
  broadcast,
};

const currencyBridge: CurrencyBridge = {
  scanAccounts,
  preload: async () => ({}),
  hydrate: () => {},
};

export default { currencyBridge, accountBridge };
