import { PlatformAccount } from "../types";
import minimatch from "minimatch";

export type AccountFilters = {
  currencies?: string[];
};

export function filterPlatformAccounts(
  accounts: PlatformAccount[],
  filters: AccountFilters
): PlatformAccount[] {
  return accounts.filter((account) => {
    if (filters.currencies) {
      const regexes = filters.currencies.map((filter) =>
        minimatch.makeRe(filter)
      );

      if (regexes.every((regex) => !account.currency.match(regex))) {
        return false;
      }
    }

    return true;
  });
}
