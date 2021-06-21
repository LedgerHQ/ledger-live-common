import type { Exchange, GetExchangeRates } from "./types";
import type { Transaction } from "../../types";
import { getAccountCurrency, getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";
import { mockGetExchangeRates } from "./mock";
import network from "../../network";
import { getSwapAPIBaseURL } from "./";
import { getEnv } from "../../env";
import { BigNumber } from "bignumber.js";
import {
  SwapExchangeRateAmountTooLow,
  SwapExchangeRateAmountTooHigh,
} from "../../errors";

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
  const tenPowMagnitude = new BigNumber(10).pow(unitFrom.magnitude);
  const apiAmount = new BigNumber(amountFrom).div(tenPowMagnitude);
  const res = await network({
    method: "POST",
    url: `${getSwapAPIBaseURL()}/rate`,
    data: [
      {
        from,
        to,
        amountFrom: apiAmount.toString(),
      },
    ],
  });
  return res.data.map(
    ({
      rate: maybeRate,
      payoutNetworkFees: maybePayoutNetworkFees,
      rateId,
      provider,
      amountFrom,
      amountTo,
      minAmountFrom,
      maxAmountFrom,
      tradeMethod,
    }) => {
      let error;
      let magnitudeAwareRate;

      if (!amountFrom) {
        const isTooSmall = new BigNumber(apiAmount).lte(minAmountFrom);
        error = isTooSmall
          ? new SwapExchangeRateAmountTooLow(undefined, {
              minAmountFromFormatted: formatCurrencyUnit(
                unitFrom,
                new BigNumber(minAmountFrom).times(tenPowMagnitude),
                {
                  alwaysShowSign: false,
                  disableRounding: true,
                  showCode: true,
                }
              ),
            })
          : new SwapExchangeRateAmountTooHigh(undefined, {
              maxAmountFromFormatted: formatCurrencyUnit(
                unitFrom,
                new BigNumber(maxAmountFrom).times(tenPowMagnitude),
                {
                  alwaysShowSign: false,
                  disableRounding: true,
                  showCode: true,
                }
              ),
            });
      } else {
        // NB Allows us to simply multiply satoshi values from/to
        magnitudeAwareRate = (tradeMethod === "fixed"
          ? new BigNumber(maybeRate)
          : new BigNumber(amountTo).div(amountFrom)
        ).div(new BigNumber(10).pow(unitFrom.magnitude - unitTo.magnitude));
      }

      const payoutNetworkFees = new BigNumber(
        maybePayoutNetworkFees || 0
      ).times(new BigNumber(10).pow(unitTo.magnitude));

      const toAmount = new BigNumber(amountTo)
        .times(new BigNumber(10).pow(unitTo.magnitude))
        .minus(payoutNetworkFees); // Nb no longer need to break it down on UI

      const rate =
        maybeRate || new BigNumber(amountTo).div(new BigNumber(amountFrom));

      return {
        magnitudeAwareRate,
        provider,
        tradeMethod,
        toAmount,
        rate,
        rateId,
        payoutNetworkFees,
        error,
      };
    }
  );
};

export default getExchangeRates;
