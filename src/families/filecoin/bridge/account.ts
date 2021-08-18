import { CurrencyNotSupported } from "@ledgerhq/errors";
import { BigNumber } from "bignumber.js";

import { makeAccountBridgeReceive, makeSync } from "../../../bridge/jsHelpers";
import { Account, AccountBridge, TransactionStatus } from "../../../types";
import { Transaction } from "../types";
import { getAccountShape } from "./utils/utils";

const receive = makeAccountBridgeReceive();

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

const sync = makeSync(getAccountShape);

export const accountBridge: AccountBridge<Transaction> = {
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
