import { useCallback, useMemo } from "react";
import { AccountLike } from "../types";
import { useCurrencies } from "../currencies/react";
import {
  accountToPlatformAccount,
  currencyToPlatformCurrency,
} from "./converters";
import {
  filterPlatformAccounts,
  filterPlatformCurrencies,
  AccountFilters,
  CurrencyFilters,
} from "./filters";
import { isPlatformSupportedCurrency } from "./helpers";
import {
  ListPlatformAccount,
  ListPlatformCurrency,
  PlatformCurrency,
  AppManifest,
} from "./types";

export function usePlatformUrl(
  manifest: AppManifest,
  style: { background: string; text: string },
  inputs: Record<string, string>
): URL {
  return useMemo(() => {
    const urlObj = new URL(manifest.url.toString());

    if (inputs) {
      for (const key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          urlObj.searchParams.set(key, inputs[key]);
        }
      }
    }

    urlObj.searchParams.set("backgroundColor", style.background);
    urlObj.searchParams.set("textColor", style.text);
    if (manifest.params) {
      urlObj.searchParams.set("params", JSON.stringify(manifest.params));
    }

    return urlObj;
  }, [manifest.url, manifest.params, style, inputs]);
}

export function useListPlatformAccounts(
  accounts: AccountLike[]
): ListPlatformAccount {
  return useCallback(
    (filters: AccountFilters = {}) => {
      const platformAccounts = accounts.map((account) =>
        accountToPlatformAccount(account, accounts)
      );

      return filterPlatformAccounts(platformAccounts, filters);
    },
    [accounts]
  );
}

export function usePlatformCurrencies(): PlatformCurrency[] {
  const currencies = useCurrencies();

  return useMemo(() => {
    return currencies
      .filter(isPlatformSupportedCurrency)
      .map(currencyToPlatformCurrency);
  }, [currencies]);
}

export function useListPlatformCurrencies(): ListPlatformCurrency {
  const currencies = usePlatformCurrencies();

  return useCallback(
    (filters?: CurrencyFilters) => {
      return filterPlatformCurrencies(currencies, filters || {});
    },
    [currencies]
  );
}
