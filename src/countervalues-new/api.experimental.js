// @flow

import URL from "url";
import { getEnv } from "../env";
import network from "../network";
import { formatPerGranularity } from "./helpers";
import type { CounterValuesAPI } from "./types";

const baseURL = () => getEnv("LEDGER_COUNTERVALUES_API");

const api: CounterValuesAPI = {
  // FIXME what is the behavior when the rate is not found?
  // FIXME what about direct VS intermediary calc?
  fetchHistorical: async (granularity, { from, to, startDate }) => {
    const format = formatPerGranularity[granularity];
    const { data } = await network({
      method: "GET",
      url: URL.format({
        pathname: `${baseURL()}/${granularity}/${from}/${to}`,
        query: {
          start: format(startDate)
        }
      })
    });
    return data;
  },

  fetchLatest: async pairs => {
    const { data } = await network({
      method: "POST",
      url: `${baseURL()}/latest`,
      data: pairs.map(({ from, to }) => ({ from, to }))
    });
    return data;
  },

  fetchMarketcapTickers: async () => {
    const { data } = await network({
      method: "GET",
      url: `${baseURL()}/tickers`
    });
    return data;
  }
};

export default api;
