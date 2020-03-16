// @flow

import type { Exchange, ExchangeRaw } from "./types";
import { fromAccountRaw, toAccountRaw } from "../account";
import { BigNumber } from "bignumber.js";

export const fromExchangeRaw = (exchangeRaw: ExchangeRaw): Exchange => {
  // FIXME how do we handle subaccounts?
  const fromAccount = fromAccountRaw(exchangeRaw.fromAccount);
  const toAccount = fromAccountRaw(exchangeRaw.toAccount);
  const fromParentAccount = exchangeRaw.fromAccount
    ? fromAccountRaw(exchangeRaw.fromAccount)
    : null;
  const toParentAccount = exchangeRaw.toAccount
    ? fromAccountRaw(exchangeRaw.toAccount)
    : null;

  return {
    fromAccount,
    fromParentAccount,
    toAccount,
    toParentAccount,
    fromAmount: BigNumber(exchangeRaw.fromAmount),
    sendMax: exchangeRaw.sendMax
  };
};

export const toExchangeRaw = (exchange: Exchange): ExchangeRaw => {
  const {
    fromAccount,
    fromParentAccount,
    toAccount,
    toParentAccount,
    fromAmount,
    sendMax
  } = exchange;

  return {
    fromAccount: toAccountRaw(fromAccount),
    fromParentAccount: fromParentAccount
      ? toAccountRaw(fromParentAccount)
      : null,
    toAccount: toAccountRaw(toAccount),
    toParentAccount: toParentAccount ? toAccountRaw(toParentAccount) : null,
    fromAmount: fromAmount.toString(),
    sendMax
  };
};
