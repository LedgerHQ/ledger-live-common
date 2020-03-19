// @flow

import type { Exchange, GetExchangeRates } from "./types";
import { getAccountCurrency, getAccountUnit } from "../account";
import { mockGetExchangeRates } from "./mock";
import network from "../network";
import { swapAPIBaseURL } from "./";
import { getEnv } from "../env";
import { BigNumber } from "bignumber.js";
import { SwapExchangeRateOutOfBounds } from "../errors";

const getExchangeRates: GetExchangeRates = async (exchange: Exchange) => {
  if (getEnv("MOCK")) return mockGetExchangeRates(exchange);

  const from = getAccountCurrency(exchange.fromAccount).ticker;
  const unitFrom = getAccountUnit(exchange.fromAccount);
  const to = getAccountCurrency(exchange.toAccount).ticker;
  const amountFrom = exchange.fromAmount.div(
    BigNumber(10).pow(unitFrom.magnitude)
  );
  const res = await network({
    method: "POST",
    url: `${swapAPIBaseURL}/rate/fixed`,
    data: [
      {
        from,
        to,
        amountFrom: amountFrom.toString()
      }
    ]
  });

  return res.data.map(
    ({ rate, rateId, provider, minAmountFrom, maxAmountFrom }) => {
      if (!rateId) {
        throw new SwapExchangeRateOutOfBounds(null, {
          from,
          to,
          minAmountFrom,
          maxAmountFrom
        });
      }

      // NB Allows us to simply multiply satoshi values from/to
      const magnitudeAwareRate = BigNumber(rate).div(
        BigNumber(10).pow(unitFrom.magnitude)
      );

      return {
        rate: magnitudeAwareRate,
        rateId,
        provider,
        expirationDate: new Date()
      };
    }
  );
};

export default getExchangeRates;
