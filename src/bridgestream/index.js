// @flow

import lzw from "node-lzw";
import type { Account, CryptoCurrencyIds } from "../types";

export type AccountData = {
  id: string,
  currencyId: string,
  seedIdentifier: string,
  derivationMode: string,
  name: string,
  index: number,
  balance: string
};

export type CryptoSettings = {
  exchange?: ?string,
  confirmationsNb?: number
};

export type Settings = {
  counterValue?: string,
  counterValueExchange?: ?string,
  currenciesSettings: {
    [_: CryptoCurrencyIds]: CryptoSettings
  }
};

export type DataIn = {
  // accounts to export (filter them to only be the visible ones)
  accounts: Account[],
  // settings
  settings: Settings,
  // the name of the exporter. e.g. "desktop" for the desktop app
  exporterName: string,
  // the version of the exporter. e.g. the desktop app version
  exporterVersion: string,

  chunkSize?: number
};

export type Result = {
  accounts: AccountData[],
  settings: Settings,
  meta: {
    exporterName: string,
    exporterVersion: string
  }
};

export function encode({
  accounts,
  settings,
  exporterName,
  exporterVersion
}: DataIn): string {
  return lzw.encode(
    JSON.stringify({
      meta: { exporterName, exporterVersion },
      accounts: accounts.map(accountToAccountData),
      settings
    })
  );
}

export function decode(bytes: string): Result {
  return JSON.parse(lzw.decode(bytes));
}

export function accountToAccountData({
  id,
  name,
  seedIdentifier,
  derivationMode,
  currency,
  index,
  balance
}: Account): AccountData {
  return {
    id,
    name,
    seedIdentifier,
    derivationMode,
    currencyId: currency.id,
    index,
    balance: balance.toString()
  };
}
