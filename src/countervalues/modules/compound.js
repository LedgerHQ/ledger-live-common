// @flow
import invariant from "invariant";
import URL from "url";
import type { TokenCurrency } from "../../types";
import type { Module } from "./types";
import { getTokenById } from "../../currencies";
import {
  startOfDay,
  startOfHour,
  hourIncrement,
  dayIncrement,
} from "../../portfolio/range";
import network from "../../network";
import { formatPerGranularity } from "../helpers";

// TODO if we go with this idea, we need to implement a mock version of this

const API_BASE = `https://api.compound.finance/api/v2`;

const fetch = (path, query = {}) =>
  network({
    type: "get",
    url: URL.format({
      pathname: `${API_BASE}${path}`,
      query,
    }),
  });

const handleCountervalue = (c) =>
  c.type === "TokenCurrency" && Boolean(c.compoundFor);

const module: Module = {
  handleCountervalue,

  resolveTrackingPair: (pair) => {
    const { from } = pair;
    if (from.type === "TokenCurrency" && from.compoundFor) {
      const to = getTokenById(from.compoundFor);
      return { from, to };
    }
    return pair;
  },

  handleAPI: ({ from, to }) =>
    Boolean(
      from.type === "TokenCurrency" &&
        from.compoundFor &&
        to === getTokenById(from.compoundFor)
    ),

  // FIXME impl it correctly fetching an api
  fetchHistorical: async (granularity, pair) => {
    const from = pair.from.type === "TokenCurrency" ? pair.from : null;
    invariant(from, "from is token currency as proven by handleAPI");
    const { startDate } = pair;
    if (!startDate) return {};
    const start = (granularity === "daily"
      ? startOfDay(startDate)
      : startOfHour(startDate)
    ).getTime();
    const increment = granularity === "daily" ? dayIncrement : hourIncrement;
    const min_block_timestamp = start / 1000;
    const num_buckets = Math.floor((Date.now() - start) / increment);
    const max_block_timestamp = (start + increment * num_buckets) / 1000;
    if (num_buckets < 2) return {};
    const format = formatPerGranularity[granularity];
    const { data } = await fetch("/market_history/graph", {
      asset: from.contractAddress,
      min_block_timestamp,
      max_block_timestamp,
      num_buckets,
    });
    const r = {};
    data.borrow_rates.map((p, i) => {
      r[format(new Date(start + i * increment))] = 1 + p.rate;
    });
    return Promise.resolve(r);
  },

  // FIXME impl it correctly fetching an api
  fetchLatest: async (pairs) => {
    const tokens: TokenCurrency[] = [];
    for (const { from } of pairs) {
      if (from.type === "TokenCurrency") {
        tokens.push(from);
      }
    }
    const { data } = await fetch("/ctoken", {
      block_timestamp: 0,
      addresses: tokens.map((c) => c.contractAddress),
    });
    return tokens.map((token) => {
      const cToken = data.cToken.find(
        (ct) =>
          ct.token_address.toLowerCase() === token.contractAddress.toLowerCase()
      );
      if (!cToken) return 0;
      return parseFloat(cToken.borrow_rate.value);
    });
  },
};

export default module;
