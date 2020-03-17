// @flow

import { BigNumber } from "bignumber.js";
import type {
  Exchange,
  ExchangeRate,
  GetProviders,
  GetStatus
} from "./types";
import type { Transaction } from "../generated/types";
import { getAccountCurrency, getAccountUnit } from "../account";
import { SwapExchangeRateOutOfBounds } from "../errors";

export const mockGetExchangeRates = async (exchange: Exchange) => {
  const { fromAccount, toAccount, fromAmount } = exchange;
  const from = getAccountCurrency(fromAccount).ticker;
  const to = getAccountCurrency(toAccount).ticker;
  const unitFrom = getAccountUnit(fromAccount);
  const amountFrom = fromAmount.div(BigNumber(10).pow(unitFrom.magnitude));

  if (amountFrom.gte(1) && amountFrom.lte(10)) {
    //Fake delay to show loading UI
    await new Promise(r => setTimeout(r, 800));
    //Mock OK
    return [
      {
        rate: BigNumber("0.5"),
        rateId: "mockedRateId",
        provider: "changelly",
        expirationDate: new Date()
      }
    ];
  } else {
    //Mock KO
    throw new SwapExchangeRateOutOfBounds(null, {
      from,
      to,
      minAmountFrom: 1,
      maxAmountFrom: 10
    });
  }
};

export const mockInitSwap = async (
  exchange: Exchange, // eslint-disable-line no-unused-vars
  exchangeRate: ExchangeRate, // eslint-disable-line no-unused-vars
  deviceId: string // eslint-disable-line no-unused-vars
): Promise<{
  transaction: Transaction,
  swapId: string
}> => {
  // TODO Better mock with input data please
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

export const mockGetProviders: GetProviders = async () => {
  //Fake delay to show loading UI
  await new Promise(r => setTimeout(r, 800));

  return [
    {
      provider: "changelly",
      supportedCurrencies: ["BTC", "LTC", "ETH"]
    }
  ];
};

export const mockGetStatus: GetStatus = async (provider, swapId) => {
  //Fake delay to show loading UI
  await new Promise(r => setTimeout(r, 800));

  return [
    {
      provider,
      swapId,
      status: "finished"
    }
  ];
};
