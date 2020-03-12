// @flow

import { BigNumber } from "bignumber.js";
import type { Exchange, ExchangeRate } from "./types";
import type { Transaction } from "../generated/types";

export const mockedGetExchangeRates = () => {
  return [
    {
      rate: BigNumber("0.5"),
      rateId: "mockedRateId",
      provider: "changelly",
      expirationDate: new Date()
    }
  ];
};

export const mockedInitSwap = async (
  exchange: Exchange, // eslint-disable-line no-unused-vars
  exchangeRate: ExchangeRate, // eslint-disable-line no-unused-vars
  deviceId: string // eslint-disable-line no-unused-vars
): Promise<{
  transaction: Transaction,
  swapId: string
}> => {
  const transaction = {
    family: "bitcoin",
    amount: BigNumber(0),
    recipient: "some_address",
    feePerByte: BigNumber(10),
    networkInfo: null,
    useAllAmount: false
  };

  return {
    transaction,
    swapId: "mockedSwapId"
  };
};

export const mockedGetProviders = async () => {
  return [
    {
      provider: "changelly",
      supportedCurrencies: ["BTC", "LTC", "ETH"]
    }
  ];
};
