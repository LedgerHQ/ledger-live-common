// @flow

import type {
  CryptoCurrencyIds,
  AccountRaw,
  TransactionRaw,
  TransactionStatusRaw
} from "../types";

export type CurrenciesData = {|
  accounts: Array<{|
    raw: AccountRaw,
    transactions?: Array<{|
      name: string,
      transaction: TransactionRaw,
      expectedStatus: $Shape<TransactionStatusRaw>
    |}>
  |}>
|};

export type DatasetTest = {|
  implementations: string[],
  currencies: {
    [_: CryptoCurrencyIds]: CurrenciesData
  }
|};
