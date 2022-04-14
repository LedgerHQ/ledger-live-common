import { PlatformAccount, PlatformCurrency } from "./types";
import { makeRe } from "minimatch";
export { makeRe } from "minimatch";

export type AccountFilters = {
  currencies?: string[];
};

export function filterPlatformAccounts(
  accounts: PlatformAccount[],
  filters: AccountFilters
): PlatformAccount[] {
  return accounts.filter((account) => {
    if (filters.currencies) {
      const regexes = filters.currencies.map((filter) => makeRe(filter));

      if (!regexes.some((regex) => account.currency.match(regex))) {
        return false;
      }
    }

    return true;
  });
}

export type CurrencyFilters = {
  includeTokens?: boolean;
  currencies?: string[];
};

export function filterPlatformCurrencies(
  currencies: PlatformCurrency[],
  filters: CurrencyFilters
): PlatformCurrency[] {
  return currencies.filter((currency) => {
    if (!filters.includeTokens && currency.type === "TokenCurrency") {
      return false;
    }

    if (filters.currencies) {
      const regexes = filters.currencies.map((filter) => makeRe(filter));

      if (!regexes.some((regex) => currency.id.match(regex))) {
        return false;
      }
    }

    return true;
  });
}
