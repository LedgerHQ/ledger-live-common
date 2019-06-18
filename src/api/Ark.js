// @flow
import { BigNumber } from "bignumber.js";
import {
  parseCurrencyUnit,
  getCryptoCurrencyById,
  formatCurrencyUnit
} from "../currencies";

const arkUnit = getCryptoCurrencyById("ark").units[0];

export const networkVersion = 23;
export const networkNethash = "6e84d08bd299ed97c212c886c98a57e36545c8f5d645ca7eeae63a8bd62d8988";
export const defaultEndpoint = "https://api.ark.io";

export const apiForEndpointConfig = (
  ArkClient: *, // you must provide {ArkClient} from "@arkecosystem/client"
  endpointConfig: ?string = null
) => {
  const server = endpointConfig || defaultEndpoint;
  const api = new ArkClient(server, 2);
  return api;
};

export const parseAPIValue = (value: string) =>
  parseCurrencyUnit(arkUnit, value);

export const parseAPICurrencyObject = ({
  currency,
  value
}: {
  currency: string,
  value: string
}) => {
  if (currency !== "ARK") {
    console.warn(`ArkJS: attempt to parse unknown currency ${currency}`);
    return BigNumber(0);
  }
  return parseAPIValue(value);
};

export const formatAPICurrencyARK = (amount: BigNumber) => {
  const value = formatCurrencyUnit(arkUnit, amount, {
    showAllDigits: true,
    disableRounding: true,
    useGrouping: false
  });
  return { currency: "ARK", value };
};
