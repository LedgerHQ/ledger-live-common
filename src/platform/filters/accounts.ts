import { PlatformAccount } from "../types";
import { makeRe } from "minimatch";

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
