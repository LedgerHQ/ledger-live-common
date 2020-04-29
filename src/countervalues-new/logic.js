// @flow

import { getEnv } from "../env";
import type { Currency, Account } from "../types";
import { flattenAccounts } from "../account";
import { getAccountCurrency } from "../account";
import { promiseAllBatched } from "../promise";
import type {
  CounterValuesState,
  CountervaluesUserSettings,
  TrackingPair,
  RateMap,
  RateGranularity
} from "./types";
import api from "./api";
import {
  magFromTo,
  formatPerGranularity,
  formatCounterValueDay,
  formatCounterValueHour
} from "./helpers";

const granularityConfig: {
  [g: RateGranularity]: { minDateDelta?: number, maxDateDelta?: number }
} = {
  daily: {
    // we fetch at least 30 days so we can always show a basic graph of that rate (regardless if we just need a few days)
    minDateDelta: 30 * 24 * 60 * 60 * 1000
  },
  hourly: {
    // we fetch at least a day
    minDateDelta: 1 * 24 * 60 * 60 * 1000,
    // we fetch at MOST a week of hourly. after that there are too much data...
    maxDateDelta: 7 * 24 * 60 * 60 * 1000
  }
};

// TODO
// export/import functions...
// TODO: implementation special logic for WETH=ETH

export const initialState = {
  data: {}
};

export async function loadCountervalues(
  state: CounterValuesState,
  settings: CountervaluesUserSettings
): Promise<CounterValuesState> {
  const histoToFetch = [];
  const latestToFetch = settings.trackingPairs;

  (!getEnv("EXPERIMENTAL_PORTFOLIO_RANGE")
    ? ["daily"]
    : ["daily", "hourly"]
  ).forEach(granularity => {
    const now = formatPerGranularity[granularity](new Date());
    const config = granularityConfig[granularity];
    settings.trackingPairs.forEach(({ from, to, startDate }) => {
      const minDate =
        config.minDateDelta && Date.now() - (config.minDateDelta || 0);
      if (minDate && minDate < startDate) {
        startDate = new Date(minDate);
      }
      const maxDate =
        config.maxDateDelta && Date.now() - (config.maxDateDelta || 0);
      if (maxDate && startDate < maxDate) {
        startDate = new Date(maxDate);
      }
      const key = `${from}-${to}`;
      const data = state.data[key];
      const inSync = data && data[now]; // TODO also make sure there is not an older date than requested before.
      if (inSync) {
        return;
      }
      // TODO we can update pair.start with latest date we got for that granularity.
      histoToFetch.push([granularity, { from, to, startDate }, key]);
    });
  });

  const [histo, latest] = await Promise.all([
    promiseAllBatched(
      5,
      histoToFetch,
      ([granularity, pair, key]) =>
        api
          .fetchHistorical(granularity, pair)
          .then(rates => ({ [key]: rates }))
          .catch(() => ({})) // TODO log errors? do we want it to be thrown?
    ),
    api
      .fetchLatest(latestToFetch)
      .then(rates => {
        const out = {};
        latestToFetch.forEach(({ from, to }, i) => {
          out[`${from}-${to}`] = rates[i];
        });
        return out;
      })
      .catch(() => ({})) // TODO log errors? do we want it to be thrown?
  ]);

  const updates = histo.concat(latest);

  // TODO should it be destructive? if pair are gone, do we clean up?
  const data = { ...state.data };
  updates.forEach(patch => {
    Object.keys(patch).forEach(key => {
      data[key] = { ...data[key], ...patch[key] };
    });
  });
  return { data };
}

export function inferTrackingPairForAccounts(
  accounts: Account[],
  countervalue: Currency
): TrackingPair[] {
  if (countervalue.disableCountervalue) return [];
  const d: { [_: string]: TrackingPair } = {};
  flattenAccounts(accounts).forEach(a => {
    const currency = getAccountCurrency(a);
    if (currency.disableCountervalue) return;
    let date = Date.now() - 1000 * 60 * 60 * 24 * 366; // TODO https://github.com/LedgerHQ/ledger-live-common/issues/629
    if (d[currency.id]) {
      date = Math.min(date, d[currency.id].startDate.getTime());
    }
    d[currency.id] = {
      from: currency.ticker,
      to: countervalue.ticker,
      startDate: new Date(date)
    };
  });
  // $FlowFixMe -_-
  return Object.values(d);
}

export function lenseRateMap(
  state: CounterValuesState,
  { from, to }: { from: Currency, to: Currency }
): ?RateMap {
  if (to.disableCountervalue || from.disableCountervalue) return;
  const rateId = `${from.ticker}-${to.ticker}`;
  return state.data[rateId];
}

export function lenseRate(
  map: RateMap,
  query: {
    from: Currency,
    to: Currency,
    date?: ?Date
  }
): ?number {
  const { date } = query;
  if (!date || date > Date.now() - 60 * 1000) return map.latest;
  const hourFormat = formatCounterValueHour(date);
  if (hourFormat in map) return map[hourFormat];
  const dayFormat = formatCounterValueDay(date);
  if (dayFormat in map) return map[dayFormat];
  // TODO should it smartly find the closest rate for this date to fix "hole" issues?
  // ^ this also can be fixed at the fetch time level / cache layer.
}

export function calculate(
  state: CounterValuesState,
  query: {
    value: number,
    from: Currency,
    to: Currency,
    disableRounding?: boolean,
    date?: ?Date
  }
): ?number {
  const map = lenseRateMap(state, query);
  if (!map) return;
  const rate = lenseRate(map, query);
  if (!rate) return;
  const { value, from, to, disableRounding } = query;
  const val = value * rate * magFromTo(from, to);
  return disableRounding ? val : Math.round(val);
}

export function calculateMany(
  state: CounterValuesState,
  dataPoints: Array<{ value: number, date: ?Date }>,
  query: { from: Currency, to: Currency }
): Array<?number> {
  const map = lenseRateMap(state, query);
  if (!map) return Array(dataPoints.length).fill(); // undefined array
  const { from, to } = query;
  const mag = magFromTo(from, to);
  return dataPoints.map(({ value, date }) => {
    const rate = lenseRate(map, { from, to, date });
    if (!rate) return;
    const val = value * rate * mag;
    return Math.round(val);
  });
}
