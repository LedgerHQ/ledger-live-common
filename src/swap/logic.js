// @flow

import { NotEnoughBalance } from "@ledgerhq/errors";
import { BigNumber } from "bignumber.js";
import type { SwapState } from "./types";
import type { AccountLike, Currency } from "../types";
import type { InstalledItem } from "../apps";
import { flattenAccounts, getAccountCurrency } from "../account";

const validCurrencyStatus = { ok: 1, noApps: 1, noAccounts: 1 };
export type CurrencyStatus = $Keys<typeof validCurrencyStatus>;
export type CurrenciesStatus = { [string]: CurrencyStatus };

export const initState: ({ okCurrencies: Currency[] }) => SwapState = ({
  okCurrencies
}) => {
  const fromCurrency = okCurrencies[0];
  const toCurrency = okCurrencies.find(c => c !== fromCurrency);

  return {
    swap: {
      exchange: {
        fromAmount: BigNumber(0),
        sendMax: false
      },
      exchangeRate: undefined
    },
    error: null,
    isLoading: false,
    okCurrencies,
    fromCurrency,
    toCurrency
  };
};

export const canRequestRates = (state: SwapState) => {
  const { swap, error } = state;
  const { exchange, exchangeRate } = swap;
  const { fromAccount, toAccount, fromAmount } = exchange;
  return !!(fromAccount && toAccount && fromAmount && !exchangeRate && !error);
};

export const getCurrenciesWithStatus = ({
  accounts,
  selectableCurrencies,
  installedApps
}: {
  accounts: AccountLike[],
  selectableCurrencies: Currency[],
  installedApps: InstalledItem[]
}): CurrenciesStatus => {
  const statuses = {};
  const installedAppsStatus = {};
  const notEmptyCurrencies = flattenAccounts(accounts).map(
    a => getAccountCurrency(a).id
  );

  for (const { name, updated } of installedApps)
    installedAppsStatus[name] = updated;
  for (const c of selectableCurrencies) {
    const mainCurrency =
      c.type === "TokenCurrency"
        ? c.parentCurrency
        : c.type === "CryptoCurrency"
        ? c
        : null;
    if (!mainCurrency) continue;
    statuses[mainCurrency.id] =
      mainCurrency.managerAppName in installedAppsStatus
        ? notEmptyCurrencies.includes(mainCurrency.id)
          ? "ok"
          : "noAccounts"
        : "noApp";
  }
  return statuses;
};

export const reducer = (
  state: SwapState,
  { type, payload }: { type: string, payload: any }
) => {
  let newState;

  switch (type) {
    case "patchExchange":
      newState = {
        ...state,
        swap: {
          ...state.swap,
          exchangeRate: null,
          exchange: { ...state.swap.exchange, ...payload }
        },
        error: null
      };
      break;
    case "fetchRates":
      newState = { ...state, isLoading: true, error: null };
      break;
    case "setRate": {
      newState = {
        ...state,
        swap: { ...state.swap, exchangeRate: payload.rate },
        isLoading: false,
        error: null
      };
      break;
    }
    case "setFromCurrency": {
      const toCurrency = state.okCurrencies.find(
        c => c !== payload.fromCurrency
      );
      newState = {
        ...state,
        swap: {
          ...state.swap,
          exchangeRate: null,
          exchange: {
            ...state.swap.exchange,
            fromAccount: undefined,
            fromAmount: BigNumber(0),
            toAccount: undefined
          }
        },
        fromCurrency: payload.fromCurrency,
        toCurrency,
        error: null
      };
      break;
    }
    case "setFromAmount": {
      let error;
      if (
        state.swap.exchange.fromAccount &&
        state.swap.exchange.fromAccount.balance.lt(payload.fromAmount)
      ) {
        error = new NotEnoughBalance();
      }

      newState = {
        ...state,
        swap: {
          ...state.swap,
          exchangeRate: null,
          exchange: {
            ...state.swap.exchange,
            fromAmount: payload.fromAmount
          }
        },
        error
      };
      break;
    }
    case "setError":
      return { ...state, error: payload.error };
    default:
      return state;
  }
  return newState;
};
