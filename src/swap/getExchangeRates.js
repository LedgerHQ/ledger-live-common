// @flow

import type { Exchange, GetExchangeRates } from "./types";
import type { Transaction } from "../types";
import { getAccountCurrency, getAccountUnit } from "../account";
import { mockGetExchangeRates } from "./mock";
import network from "../network";
import { swapAPIBaseURL } from "./";
import { getEnv } from "../env";
import { BigNumber } from "bignumber.js";
import { SwapExchangeRateOutOfBounds } from "../errors";

const getExchangeRates: GetExchangeRates = async (
  exchange: Exchange,
  transaction: Transaction
) => {
  if (getEnv("MOCK")) return mockGetExchangeRates(exchange, transaction);

  const from = getAccountCurrency(exchange.fromAccount).id;
  const unitFrom = getAccountUnit(exchange.fromAccount);
  const unitTo = getAccountUnit(exchange.toAccount);
  const to = getAccountCurrency(exchange.toAccount).id;
  const amountFrom = transaction.amount;
  const apiAmount = BigNumber(amountFrom).div(
    BigNumber(10).pow(unitFrom.magnitude)
  );

  const res = await network({
    method: "POST",
    url: `${swapAPIBaseURL}/rate/fixed`,
    data: [
      {
        from,
        to,
        amountFrom: apiAmount.toString(),
      },
    ],
  });

  return res.data.map(
    ({ rate, rateId, provider, minAmountFrom, maxAmountFrom }) => {
      if (!rate || !rateId) {
        throw new SwapExchangeRateOutOfBounds(null, {
          unit: unitFrom.code,
          minAmountFrom,
          maxAmountFrom,
        });
      }

      // NB Allows us to simply multiply satoshi values from/to
      const magnitudeAwareRate = BigNumber(rate).div(
        BigNumber(10).pow(unitFrom.magnitude - unitTo.magnitude)
      );

      return {
        magnitudeAwareRate,
        rate,
        rateId,
        provider,
        expirationDate: new Date(),
      };
    }
  );
};

export default getExchangeRates;
