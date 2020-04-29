// @flow

import { getEnv } from "../env";
import type { Currency, Account } from "../types";
import { flattenAccounts } from "../account";
import { getAccountCurrency } from "../account";
import { promiseAllBatched } from "../promise";
import type {
  CounterValuesState,
  CountervaluesSettings,
  TrackingPair,
  RateMap,
  RateGranularity,
} from "./types";
import api from "./api";
import {
  magFromTo,
  formatPerGranularity,
  formatCounterValueDay,
  formatCounterValueHour,
} from "./helpers";

const granularityConfig: {
  [g: RateGranularity]: { minDateDelta?: number, maxDateDelta?: number },
} = {
  daily: {
    // we fetch at least 30 days so we can always show a basic graph of that rate (regardless if we just need a few days)
    minDateDelta: 30 * 24 * 60 * 60 * 1000,
  },
  hourly: {
    // we fetch at least a day
    minDateDelta: 1 * 24 * 60 * 60 * 1000,
    // we fetch at MOST a week of hourly. after that there are too much data...
    maxDateDelta: 7 * 24 * 60 * 60 * 1000,
  },
};

// TODO
// export/import functions...
// TODO: implementation special logic for WETH=ETH

export const initialState = {
  data: {},
  stats: {},
  cache: {},
};

const DAY = 24 * 60 * 60 * 1000;

export async function loadCountervalues(
  state: CounterValuesState,
  settings: CountervaluesSettings
): Promise<CounterValuesState> {
  const stats = { ...state.stats };
  const data = { ...state.data };
  const cache = { ...state.cache };

  const histoToFetch = [];
  const latestToFetch = settings.trackingPairs;

  (!getEnv("EXPERIMENTAL_PORTFOLIO_RANGE")
    ? ["daily"]
    : ["daily", "hourly"]
  ).forEach((granularity) => {
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
      const value = data[key];
      const inSync = value && value[now]; // TODO also make sure there is not an older date than requested before.
      const stat = stats[key];
      const needOlderReload =
        stat && startDate < new Date(stat.oldestDateRequested);
      if (inSync && !needOlderReload) {
        return;
      }

      // FIXME this all shall be set if it SUCCESS.
      stats[key] = {
        ...stat,
        oldestDateRequested: startDate.toISOString(),
      };
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
          .then((rates) => ({ [key]: rates }))
          .catch(() => ({})) // TODO log errors? do we want it to be thrown?
    ),
    api
      .fetchLatest(latestToFetch)
      .then((rates) => {
        const out = {};
        latestToFetch.forEach(({ from, to }, i) => {
          out[`${from}-${to}`] = { latest: rates[i] };
        });
        return out;
      })
      .catch(() => ({})), // TODO log errors? do we want it to be thrown?
  ]);

  const updates = histo.concat(latest);

  // TODO should it be destructive? if pair are gone, do we clean up?
  const changesKeys = {};
  updates.forEach((patch) => {
    Object.keys(patch).forEach((key) => {
      changesKeys[key] = 1;
      data[key] = { ...data[key], ...patch[key] };
    });
  });

  // synchronize the cache
  Object.keys(changesKeys).forEach((pair) => {
    delete cache[pair];
    const value = { ...data[pair] };

    if (settings.autofillGaps) {
      const sorted = Object.keys(value).sort();
      const oldest = sorted[0];
      const now = Date.now();
      const oldestTime = new Date(oldest).getTime();
      let shiftingValue = value.latest || 0;
      for (let t = now; t >= oldestTime; t -= DAY) {
        const k = formatCounterValueDay(new Date(t));
        if (!(k in value)) {
          value[k] = shiftingValue;
        } else {
          shiftingValue = value[k];
        }
      }
      // before the oldest time fallbacks to oldest known value.
      value.fallback = shiftingValue;
    }

    cache[pair] = value;
  });

  return { data, cache, stats };
}

export function inferTrackingPairForAccounts(
  accounts: Account[],
  countervalue: Currency
): TrackingPair[] {
  if (countervalue.disableCountervalue) return [];
  const d: { [_: string]: TrackingPair } = {};
  flattenAccounts(accounts).forEach((a) => {
    const currency = getAccountCurrency(a);
    if (currency.disableCountervalue) return;
    let date = a.creationDate.getTime();
    if (d[currency.id]) {
      date = Math.min(date, d[currency.id].startDate.getTime());
    }
    d[currency.id] = {
      from: currency.ticker,
      to: countervalue.ticker,
      startDate: new Date(date),
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
  return state.cache[rateId];
}

export function lenseRate(
  map: RateMap,
  query: {
    from: Currency,
    to: Currency,
    date?: ?Date,
  }
): ?number {
  const { date } = query;
  if (!date || date > Date.now() - 60 * 1000) return map.latest;
  const hourFormat = formatCounterValueHour(date);
  if (hourFormat in map) return map[hourFormat];
  const dayFormat = formatCounterValueDay(date);
  if (dayFormat in map) return map[dayFormat];
  return map.fallback;
}

export function calculate(
  state: CounterValuesState,
  query: {
    value: number,
    from: Currency,
    to: Currency,
    disableRounding?: boolean,
    date?: ?Date,
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
