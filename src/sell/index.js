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
      "094368616e67656c6c790480d7c0d3a9183597395f58dda05999328da6f18fabd5cda0aff8e8e3fc633436a2dbf48ecb23d40df7c3c7d3e774b77b4b5df0e9f7e08cf1cdf2dba788eb085b",
      "hex"
    ),
    signature: Buffer.from(
      "3045022100e73339e5071b5d232e8cacecbd7c118c919122a43f8abb8b2062d4bfcd58274e022050b11605d8b7e199f791266146227c43fd11d7645b1d881f705a2f8841d21de5",
      "hex"
    ),
    curve: "secpk256k1",
  },
  coinify: {
    nameAndPubkey: Buffer.concat([
      Buffer.from([7]),
      Buffer.from("Coinify", "ascii"),
      Buffer.from(
        "04CEA7DC8B189FA0D7A5A97530B50556CB0C14079C39CD44532D7037F2B96F0FA9C2DE588E1840B351B71114EE4021FC260F790A6F2D0CDF1C3E1899CCF97D3CCB",
        "hex"
      ),
    ]),

    signature: Buffer.from(
      "3043021f023ecbbb1dfd44f390944bd1f6c039942943009a51ca4f134589441476651a02200cbfdf2ebe32eb0b0a88be9b1fec343ed5b230a69e65a1d15b4e34ef4206a9dd",
      "hex"
    ),
    curve: "secpk256k1",
  },
  coinifysandbox: {
    nameAndPubkey: Buffer.concat([
      Buffer.from([7]),
      Buffer.from("Coinify", "ascii"),
      Buffer.from(
        "04CEA7DC8B189FA0D7A5A97530B50556CB0C14079C39CD44532D7037F2B96F0FA9C2DE588E1840B351B71114EE4021FC260F790A6F2D0CDF1C3E1899CCF97D3CCB",
        "hex"
      ),
    ]),
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
