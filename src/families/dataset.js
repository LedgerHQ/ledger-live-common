// @flow

import type { CryptoCurrencyIds, AccountRaw } from "../types";

export type CurrenciesData = {|
  recipients?: Array<{|
    address: string,
    isValid: boolean
  |}>,
  accounts: Array<{|
    raw: AccountRaw
  |}>
|};

export type DatasetTest = {|
  implementations: string[],
  currencies: {
    [_: CryptoCurrencyIds]: CurrenciesData
  }
|};
