// @flow

import type {
  CryptoCurrencyIds,
  AccountRaw,
  TransactionRaw,
  TransactionStatusRaw
} from "../types";

export type CurrenciesData = {|
  recipients?: Array<{|
    address: string,
    isValid: boolean
  |}>,
  accounts: Array<{|
    raw: AccountRaw,
    transactions?: Array<{|
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
