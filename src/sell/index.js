// @flow

import type { CryptoCurrency, TokenCurrency } from "../types/currencies";
import checkSignatureAndPrepare from "./checkSignatureAndPrepare";
import { getEnv } from "../env";
import { valid, gte } from "semver";

const getSwapAPIBaseURL: () => string = () => getEnv("SWAP_API_BASE");
const sellProviders: {
  [string]: { nameAndPubkey: Buffer, signature: Buffer, curve: string },
} = {
  changelly: {
    nameAndPubkey: Buffer.from(
      "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEzqfcixifoNelqXUwtQVWywwUB5w5zURTLXA38rlvD6nC3liOGECzUbcRFO5AIfwmD3kKby0M3xw+GJnM+X08yw",
      "base64"
    ),
    signature: Buffer.from(
      "3043021f023ecbbb1dfd44f390944bd1f6c039942943009a51ca4f134589441476651a02200cbfdf2ebe32eb0b0a88be9b1fec343ed5b230a69e65a1d15b4e34ef4206a9dd",
      "hex"
    ),
    curve: "secpk256k1",
  },
  coinifySandbox: {
    nameAndPubkey: Buffer.from(
      "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAETyJmj18yHTeEJmyTKioxQcPsGW3dUfQs+XUmftoj06iwIXDkxccFNufQO6TmbuPh+dZedy0yF4cagwp89g2jZg",
      "base64"
    ),
    signature: Buffer.from(
      "3043021f023ecbbb1dfd44f390944bd1f6c039942943009a51ca4f134589441476651a02200cbfdf2ebe32eb0b0a88be9b1fec343ed5b230a69e65a1d15b4e34ef4206a9dd",
      "hex"
    ),
    curve: "secpk256k1",
  },
};

// Minimum version of a currency app which has exchange capabilities, meaning it can be used
// for sell/swap, and do silent signing.
const exchangeSupportAppVersions = {
  bitcoin_cash: "1.5.0",
  bitcoin_gold: "1.5.0",
  bitcoin: "1.5.0",
  dash: "1.5.0",
  digibyte: "1.5.0",
  dogecoin: "1.5.0",
  ethereum: "1.4.0",
  litecoin: "1.5.0",
  qtum: "1.5.0",
  stratis: "1.5.0",
  zcash: "1.5.0",
  zencash: "1.5.0",
};

export const isExchangeSupportedByApp = (
  appName: string,
  appVersion: string
): boolean => {
  const minVersion = exchangeSupportAppVersions[appName];
  return valid(minVersion) && valid(appVersion) && gte(appVersion, minVersion);
};

const getCurrencySwapConfig = (
  currency: CryptoCurrency | TokenCurrency
): SwapCurrencyNameAndSignature => {
  const res = exchangeCurrencyConfigs[currency.id];
  if (!res) {
    throw new Error(`Swap, missing configuration for ${currency.id}`);
  }
  return {
    config: Buffer.from(res.config, "hex"),
    signature: Buffer.from(res.signature, "hex"),
  };
};

const getProvider = (
  providerName: string
): SwapProviderNameAndSignature => {
  const res = sellProviders[providerName.toLowerCase()];
  if (!res) {
    throw new Error(`Unknown partner ${providerName}`);
  }
  return res;
};

const isCurrencySwapSupported = (
  currency: CryptoCurrency | TokenCurrency
): boolean => {
  return true;
};

export {
  getSwapAPIBaseURL,
  getProvider,
  getCurrencySwapConfig,
  isCurrencySwapSupported,
  checkSignatureAndPrepare,
};
