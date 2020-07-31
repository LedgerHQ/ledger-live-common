// @flow
import values from "lodash/values";
import type { CryptoCurrency, TokenAccount } from "../../../types";
import * as compound from "./compound";

const modules = { compound };

export async function preload(): Promise<Object> {
  const value = {};
  for (let k in modules) {
    const m = modules[k];
    if (m.preload) {
      value[k] = await m.preload();
    }
  }
  return value;
}

export function hydrate(value: Object) {
  for (let k in value) {
    if (k in modules) {
      const m = modules[k];
      if (m.hydrate) {
        m.hydrate(value[k]);
      }
    }
  }
}

export const prepareTokenAccounts = (
  currency: CryptoCurrency,
  subAccounts: TokenAccount[]
): Promise<TokenAccount[]> =>
  values(modules)
    .map((m) => m.prepareTokenAccounts)
    .filter(Boolean)
    .reduce(
      (p, fn) => p.then((s) => fn(currency, s)),
      Promise.resolve(subAccounts)
    );

export const digestTokenAccounts = (
  currency: CryptoCurrency,
  subAccounts: TokenAccount[]
): Promise<TokenAccount[]> =>
  values(modules)
    .map((m) => m.digestTokenAccounts)
    .filter(Boolean)
    .reduce(
      (p, fn) => p.then((s) => fn(currency, s)),
      Promise.resolve(subAccounts)
    );
