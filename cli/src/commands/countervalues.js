// @flow

import { BigNumber } from "bignumber.js";
import asciichart from "asciichart";
import invariant from "invariant";
import { from } from "rxjs";
import { toBalanceHistoryRaw } from "@ledgerhq/live-common/lib/account";
import type { PortfolioRange } from "@ledgerhq/live-common/lib/types";
import { getRanges, getDates } from "@ledgerhq/live-common/lib/portfolio";
import {
  formatCurrencyUnit,
  findCurrencyByTicker,
} from "@ledgerhq/live-common/lib/currencies";
import {
  initialState,
  calculateMany,
  loadCountervalues,
} from "@ledgerhq/live-common/lib/countervalues-new/logic";
import CountervaluesAPI from "@ledgerhq/live-common/lib/countervalues-new/api";

const histoFormatters = {
  stats: (histo, currency, countervalue) =>
    (currency.ticker + " to " + countervalue.ticker).padEnd(12) +
    " availability=" +
    ((100 * histo.filter((h) => h.value).length) / histo.length).toFixed(0) +
    "%",

  default: (histo, currency, countervalue) =>
    histo
      .map(
        ({ date, value }) =>
          date.toISOString() +
          " " +
          formatCurrencyUnit(countervalue.units[0], BigNumber(value || 0), {
            showCode: true,
            disableRounding: true,
          })
      )
      .join("\n"),

  json: (histo) => toBalanceHistoryRaw(histo),

  asciichart: (history, currency, countervalue) =>
    "\n" +
    "".padStart(22) +
    currency.name +
    " to " +
    countervalue.name +
    "\n" +
    asciichart.plot(
      history.map((h) =>
        BigNumber(h.value || 0)
          .div(BigNumber(10).pow(countervalue.units[0].magnitude))
          .toNumber()
      ),
      {
        height: 10,
        format: (value) =>
          formatCurrencyUnit(
            countervalue.units[0],
            BigNumber(value).times(
              BigNumber(10).pow(countervalue.units[0].magnitude)
            ),
            {
              showCode: true,
              disableRounding: true,
            }
          ).padStart(20),
      }
    ),
};

function asPortfolioRange(period: string): PortfolioRange {
  const ranges = getRanges();
  invariant(
    ranges.includes(period),
    "invalid period. valid values are %s",
    ranges.join(" | ")
  );
  // $FlowFixMe
  return period;
}

export default {
  description: "Get the balance history for accounts",
  args: [
    {
      name: "currency",
      alias: "c",
      type: String,
      desc: "ticker of a currency",
      multiple: true,
    },
    {
      name: "countervalue",
      type: String,
      desc: "ticker of a currency",
    },
    {
      name: "period",
      alias: "p",
      type: String,
      desc: getRanges().join(" | "),
    },
    {
      name: "format",
      alias: "f",
      type: String,
      typeDesc: Object.keys(histoFormatters).join(" | "),
      desc: "how to display the data",
    },
    {
      name: "verbose",
      alias: "v",
      type: Boolean,
    },
    {
      name: "marketcap",
      alias: "m",
      type: Boolean,
      desc:
        "use all tickers available in marketcap instead of having to specify each --currency",
    },
    {
      name: "size",
      alias: "s",
      type: Number,
      desc: "limit the number of rates to request (for marketcap usage)",
    },
    {
      name: "disableAutofillGaps",
      alias: "g",
      type: Boolean,
      desc:
        "if set, disable the autofill of gaps to evaluate the rates availability",
    },
  ],
  job: (
    opts: $Shape<{
      currency: string[],
      countervalue: string,
      format: string,
      period: string,
      verbose: boolean,
      marketcap: boolean,
      size: number,
      disableAutofillGaps: boolean,
    }>
  ) => {
    async function f() {
      let tickers;
      if (opts.marketcap) {
        tickers = await CountervaluesAPI.fetchMarketcapTickers();
      }

      if (!tickers) {
        tickers = opts.currency || ["BTC"];
      }

      if (opts.size) {
        tickers.splice(opts.size);
      }

      const countervalue = findCurrencyByTicker(opts.countervalue || "USD");
      invariant(
        countervalue,
        "currency not found with ticker=" + opts.countervalue
      );
      const format = histoFormatters[opts.format || "default"];
      const range = asPortfolioRange(opts.period || "month");
      const dates = getDates(range);
      const settings = {
        trackingPairs: tickers.map((from) => ({
          from,
          to: countervalue.ticker,
          startDate: new Date(dates[0] - 24 * 60 * 60 * 1000),
        })),
        autofillGaps: !opts.disableAutofillGaps,
      };

      const countervalues = await loadCountervalues(initialState, settings);

      // eslint-disable-next-line no-console
      if (opts.verbose) console.log(countervalues);

      const histos = [];

      function stats() {
        const [available, total] = histos.reduce(
          ([available, total], histo) => [
            available + histo.filter((h) => h.value).length,
            total + histo.length,
          ],
          [0, 0]
        );
        return (
          "Total availability: " + ((100 * available) / total).toFixed() + "%"
        );
      }

      return (
        tickers
          .map((currencyTicker) => {
            const currency = findCurrencyByTicker(currencyTicker);
            invariant(
              currency,
              "currency not found with ticker=" + currencyTicker
            );
            const value = 10 ** currency.units[0].magnitude;
            const histo = calculateMany(
              countervalues,
              dates.map((date) => ({ value, date })),
              { from: currency, to: countervalue }
            ).map((value, i) => ({ value, date: dates[i] }));
            histos.push(histo);
            return format(histo, currency, countervalue);
          })
          .join("\n") + (opts.format === "stats" ? "\n" + stats() : "")
      );
    }

    return from(f());
  },
};
