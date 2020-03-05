// @flow

import type { Exchange, GetExchangeRates } from "./types";
import { getAccountCurrency } from "../account";
import network from "../network";
import { swapAPIBaseURL } from "./";

const getExchangeRates: GetExchangeRates = async (exchange: Exchange) => {
  const from = getAccountCurrency(exchange.fromAccount).ticker;
  const to = getAccountCurrency(exchange.toAccount).ticker;

  const res = await network({
    method: "POST",
    url: `${swapAPIBaseURL}/rate/fixed`,
    data: [
      {
        from,
        to,
        amountFrom: exchange.fromAmount
      }
    ]
  });

  if (res.data) {
    return res.data.map(
      ({ rate, rateId, provider, minAmountFrom, maxAmountFrom }) => {
        if (!rateId) {
          throw new Error(
            `getExchangeRate: Rate available for amounts between ${minAmountFrom} and ${maxAmountFrom}`
          );
        }
        return {
          rate,
          rateId,
          provider,
          expirationDate: new Date()
        };
      }
    );
  }

  throw new Error("getExchangeRate: Something broke");
};

export default getExchangeRates;
