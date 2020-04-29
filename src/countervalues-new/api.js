// @flow

import { getEnv } from "../env";
import type { CounterValuesAPI } from "./types";
import experimentalAPI from "./api.experimental";
import legacyAPI from "./api.legacy";
import mockAPI from "./api.mock";

const api: CounterValuesAPI = {
  fetchHistorical: (granularity, pair) =>
    getEnv("MOCK")
      ? mockAPI.fetchHistorical(granularity, pair)
      : getEnv("LEDGER_COUNTERVALUES_API_EXPERIMENTAL")
      ? experimentalAPI.fetchHistorical(granularity, pair)
      : legacyAPI.fetchHistorical(granularity, pair),

  fetchLatest: (pairs) =>
    getEnv("MOCK")
      ? mockAPI.fetchLatest(pairs)
      : getEnv("LEDGER_COUNTERVALUES_API_EXPERIMENTAL")
      ? experimentalAPI.fetchLatest(pairs)
      : legacyAPI.fetchLatest(pairs),

  fetchMarketcapTickers: () =>
    getEnv("MOCK")
      ? mockAPI.fetchMarketcapTickers()
      : getEnv("LEDGER_COUNTERVALUES_API_EXPERIMENTAL")
      ? experimentalAPI.fetchMarketcapTickers()
      : legacyAPI.fetchMarketcapTickers(),
};

export default api;
