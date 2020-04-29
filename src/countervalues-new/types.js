// @flow

export type RateGranularity = "daily" | "hourly";

export type RateMap = {
  [day: string]: number
  // IDEA with the data we should probably have metadata:
  // startDate, endDate, path of pairs (e.g. ETH->BTC via Binance, BTC->EUR via kraken)
};

export type TrackingPair = {
  from: string,
  to: string,
  startDate: Date
};

export type CounterValuesAPI = {
  fetchHistorical: (
    granularity: RateGranularity,
    pair: TrackingPair
  ) => Promise<RateMap>,

  fetchLatest: (pairs: TrackingPair[]) => Promise<Array<?number>>,

  fetchMarketcapTickers: () => Promise<string[]>
};

// This would be the user config that drives the countervalues logic.
// it is not clear yet if it's part of CounterValuesState itself :thinking_face:
export type CountervaluesUserSettings = {
  trackingPairs: TrackingPair[]
  // TODO: preferredExchanges: string[]
};
// DISCUSS: is it for us to convert TrackingPair[] (what user needs) to actual pairs?
// aka are we going to send that to backend or do we keep doing it client side?
// both are possible and to be discussed what would be ideal here.

export type CounterValuesState = {
  // e.g.: { "BTC-USD", { "latest": 999, "YYYY-MM-DD": daily, "YYYY-MM-DDTHH": hourly,.... }
  data: {
    [pairId: string]: RateMap
  }
  // IDEA: based on how we have the final FROM-TO mapping,
  // we might want to also have a "cache" layer that would pre-compute once the direct mapping
  // and would also complete the data in case of holes...
};

// TODO this would be the serialized version of CounterValuesState
// The goal here is to make a key-value map where the value is not exceeding 2MB for Android to not glitch...
export type CounterValuesStateRaw = {
  [pairId: string]: RateMap
};
