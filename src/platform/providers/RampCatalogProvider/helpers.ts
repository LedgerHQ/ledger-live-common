import _ from "lodash";
import { RampCatalogEntry } from "./types";

export type RampFilters = {
  fiatCurrencies?: string[];
  cryptoCurrencies?: string[];
  paymentProviders?: string[];
};

function filterArray(array: string[], filters: string[]) {
  return filters.every((filter) => array.includes(filter));
}

export function filterRampCatalogEntries(
  entries: RampCatalogEntry[],
  filters: RampFilters
): RampCatalogEntry[] {
  return entries.filter((entry) => {
    if (
      filters.cryptoCurrencies &&
      !filterArray(entry.cryptoCurrencies, filters.cryptoCurrencies)
    ) {
      return false;
    }

    if (
      filters.fiatCurrencies &&
      !filterArray(entry.fiatCurrencies, filters.fiatCurrencies)
    ) {
      return false;
    }

    if (
      filters.paymentProviders &&
      !filterArray(entry.paymentProviders, filters.paymentProviders)
    ) {
      return false;
    }
    return true;
  });
}

export function getAllSupportedCryptoCurrencies(
  entries: RampCatalogEntry[]
): string[] {
  return _.uniq(_.flatten(entries.map((entry) => entry.cryptoCurrencies)));
}
