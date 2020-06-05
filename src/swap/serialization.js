// @flow

import type { Exchange, ExchangeRaw } from "./types";
import {
  fromAccountLikeRaw,
  fromAccountRaw,
  toAccountLikeRaw,
  toAccountRaw,
} from "../account";
import { fromTransactionRaw, toTransactionRaw } from "../transaction";

export const fromExchangeRaw = (exchangeRaw: ExchangeRaw): Exchange => {
  const fromAccount = fromAccountLikeRaw(exchangeRaw.fromAccount);
  const toAccount = fromAccountLikeRaw(exchangeRaw.toAccount);
  const fromParentAccount = exchangeRaw.fromParentAccount
    ? fromAccountRaw(exchangeRaw.fromParentAccount)
    : null;
  const toParentAccount = exchangeRaw.toParentAccount
    ? fromAccountRaw(exchangeRaw.toParentAccount)
    : null;
  const transaction = fromTransactionRaw(exchangeRaw.transaction);

  return {
    fromAccount,
    fromParentAccount,
    toAccount,
    toParentAccount,
    transaction,
  };
};

export const toExchangeRaw = (exchange: Exchange): ExchangeRaw => {
  const {
    fromAccount,
    fromParentAccount,
    toAccount,
    toParentAccount,
    transaction,
  } = exchange;

  return {
    fromAccount: toAccountLikeRaw(fromAccount),
    fromParentAccount: fromParentAccount
      ? toAccountRaw(fromParentAccount)
      : null,
    toAccount: toAccountLikeRaw(toAccount),
    toParentAccount: toParentAccount ? toAccountRaw(toParentAccount) : null,
    transaction: toTransactionRaw(transaction),
  };
};
