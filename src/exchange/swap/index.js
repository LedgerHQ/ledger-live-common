// @flow

import type { ExchangeProviderNameAndSignature } from "../";
import getExchangeRates from "./getExchangeRates";
import getStatus from "./getStatus";
import getProviders from "./getProviders";
import getCompleteSwapHistory from "./getCompleteSwapHistory";
import getKYCStatus from "./getKYCStatus";
import submitKYC from "./submitKYC";
import initSwap from "./initSwap";
import { getEnv } from "../../env";

export const operationStatusList = {
  finishedOK: ["finished"],
  finishedKO: ["expired", "refunded"],
  pending: ["pending", "onhold"],
};

const getSwapAPIBaseURL: () => string = () => getEnv("SWAP_API_BASE");
const swapProviders: {
  [string]: {
    nameAndPubkey: Buffer,
    signature: Buffer,
    curve: string,
    needsKYC: boolean,
  },
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
    needsKYC: false,
  },
  wyre: {
    // FIXME we dont have these.
    nameAndPubkey: Buffer.from(""),
    signature: Buffer.from(""),
    curve: "secpk256k1",
    needsKYC: false,
  },
};

const getProviderNameAndSignature = (
  providerName: string
): ExchangeProviderNameAndSignature => {
  const res = swapProviders[providerName.toLowerCase()];
  if (!res) {
    throw new Error(`Unknown partner ${providerName}`);
  }
  return res;
};

const USStates = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District Of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const countries = {
  US: "United States",
  ES: "Spain", // FIXME remove before merging
};

export {
  getSwapAPIBaseURL,
  getProviderNameAndSignature,
  getProviders,
  getStatus,
  getExchangeRates,
  getCompleteSwapHistory,
  initSwap,
  getKYCStatus,
  submitKYC,
  USStates,
  countries,
};
