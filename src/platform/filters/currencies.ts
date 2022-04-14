import { PlatformCurrency } from "../types";
import { makeRe } from "minimatch";

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
