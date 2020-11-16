// @flow

import { BigNumber } from "bignumber.js";
import type {
  Exchange,
  ExchangeRate,
  GetMultipleStatus,
  GetProviders,
  SwapRequestEvent,
} from "./types";
import { getAccountUnit } from "../../account";
import type { Transaction } from "../../types";
import {
  SwapExchangeRateAmountTooLow,
  SwapExchangeRateAmountTooHigh,
} from "../../errors";
import { Observable, of } from "rxjs";

export const mockGetExchangeRates = async (
  exchange: Exchange,
  transaction: Transaction
) => {
  const { fromAccount, toAccount } = exchange;
  const amount = transaction.amount;
  const unitFrom = getAccountUnit(fromAccount);
  const unitTo = getAccountUnit(toAccount);
  const amountFrom = amount.div(BigNumber(10).pow(unitFrom.magnitude));
  const minAmountFrom = BigNumber(0.0001);
  const maxAmountFrom = BigNumber(1000);

  if (amountFrom.lte(minAmountFrom)) {
    throw new SwapExchangeRateAmountTooLow(null, {
      unit: unitFrom.code,
      minAmountFrom,
    });
  }

  if (amountFrom.gte(maxAmountFrom)) {
    throw new SwapExchangeRateAmountTooHigh(null, {
      unit: unitFrom.code,
      maxAmountFrom,
    });
  }

  //Fake delay to show loading UI
  await new Promise((r) => setTimeout(r, 800));

  //Mock OK, not really magnitude aware
  return [
    {
      rate: BigNumber("1"),
      magnitudeAwareRate: BigNumber(1)
        .div(BigNumber(10).pow(unitFrom.magnitude))
        .times(BigNumber(10).pow(unitTo.magnitude)),
      rateId: "mockedRateId",
      provider: "changelly",
      expirationDate: new Date(),
    },
  ];
};

export const mockInitSwap = (
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  transaction: Transaction
): Observable<SwapRequestEvent> => {
  return of({
    type: "init-swap-result",
    initSwapResult: {
      transaction,
      swapId: "mockedSwapId",
    },
  });
};

export const mockGetProviders: GetProviders = async () => {
  //Fake delay to show loading UI
  await new Promise((r) => setTimeout(r, 800));

  return [
    {
      provider: "changelly",
      supportedCurrencies: [
        "bitcoin",
        "litecoin",
        "ethereum",
        "tron",
        "ethereum/erc20/omg",
        "ethereum/erc20/0x_project",
        "ethereum/erc20/augur",
      ],
    },
  ];
};

export const mockGetStatus: GetMultipleStatus = async (statusList) => {
  //Fake delay to show loading UI
  await new Promise((r) => setTimeout(r, 800));
  return statusList.map((s) => ({ ...s, status: "finished" }));
};
