import { PlatformCurrency } from "../types";

export type CurrencyFilters = {
  types?: string[];
};

export function filterPlatformCurrencies(
  currencies: PlatformCurrency[],
  filters: CurrencyFilters
): PlatformCurrency[] {
  return currencies.filter((currency) => {
    if (
      filters.types &&
      !filters.types.some((type) => type === currency.type)
    ) {
      return false;
    }
    return true;
  });
}
