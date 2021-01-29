// @flow
import type { AccountBridge, CurrencyBridge } from "../../../types";
import type { Transaction } from "../types";

import libcore from "../libcore";

const libCoreCurrencyBridge = libcore.currencyBridge;
const libCoreAccountBridge = libcore.accountBridge;

const currencyBridge: CurrencyBridge = {
  getPreloadStrategy: libCoreCurrencyBridge.getPreloadStrategy,
  preload: libCoreCurrencyBridge.preload,
  hydrate: libCoreCurrencyBridge.hydrate,
  scanAccounts: libCoreCurrencyBridge.scanAccounts,
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction: libCoreAccountBridge.createTransaction,
  updateTransaction: libCoreAccountBridge.updateTransaction,
  prepareTransaction: libCoreAccountBridge.prepareTransaction,
  estimateMaxSpendable: libCoreAccountBridge.estimateMaxSpendable,
  getTransactionStatus: libCoreAccountBridge.getTransactionStatus,
  sync: libCoreAccountBridge.sync,
  receive: libCoreAccountBridge.receive,
  signOperation: libCoreAccountBridge.signOperation,
  broadcast: libCoreAccountBridge.broadcast,
};

export default { currencyBridge, accountBridge };
