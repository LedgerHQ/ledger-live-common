// @flow

import type { Exchange, ExchangeRaw } from "./types";
import {
  fromAccountLikeRaw,
  fromAccountRaw,
  toAccountLikeRaw,
  toAccountRaw
} from "../account";
import { BigNumber } from "bignumber.js";

export const fromExchangeRaw = (exchangeRaw: ExchangeRaw): Exchange => {
  const fromAccount = fromAccountLikeRaw(exchangeRaw.fromAccount);
  const toAccount = fromAccountLikeRaw(exchangeRaw.toAccount);
  const fromParentAccount = exchangeRaw.fromParentAccount
    ? fromAccountRaw(exchangeRaw.fromParentAccount)
    : null;
  const toParentAccount = exchangeRaw.toParentAccount
    ? fromAccountRaw(exchangeRaw.toParentAccount)
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
    fromAccount: toAccountLikeRaw(fromAccount),
    fromParentAccount: fromParentAccount
      ? toAccountRaw(fromParentAccount)
      : null,
    toAccount: toAccountLikeRaw(toAccount),
    toParentAccount: toParentAccount ? toAccountRaw(toParentAccount) : null,
    fromAmount: fromAmount.toString(),
    sendMax
  };
};
