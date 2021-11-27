import type { Transaction } from "../types";
import type { Account, AccountBridge, CurrencyBridge } from "../../../types";
import {
  scanAccounts,
  signOperation,
  broadcast,
  sync,
} from "../../../bridge/mockHelpers";
import { makeAccountBridgeReceive } from "../../../bridge/mockHelpers";
import estimateMaxSpendable from "../js-estimateMaxSpendable";
import createTransaction, { updateTransaction } from "../js-createTransaction";
import getTransactionStatus from "../js-getTransactionStatus";

const receive = makeAccountBridgeReceive();

const prepareTransaction = async (
  _: Account,
  t: Transaction
): Promise<Transaction> => ({
  ...t,
});

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
  preload: async (_: any) => ({} as any),
  hydrate: () => {},
};

export default { currencyBridge, accountBridge };
