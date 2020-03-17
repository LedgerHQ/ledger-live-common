// @flow

import type { GetProviders } from "./types";
import network from "../network";
import { swapAPIBaseURL } from "./";
import { getEnv } from "../env";
import { mockGetProviders } from "./mock";
import { SwapNoAvailableProviders } from "../errors";

const getProviders: GetProviders = async () => {
  if (getEnv("MOCK")) return mockGetProviders();

  const res = await network({
    method: "GET",
    url: `${swapAPIBaseURL}/providers`
  });

  if (!res.data.length) {
    return new SwapNoAvailableProviders();
  }

  return res.data.map(({ provider, supportedCurrencies }) => ({
    provider,
    supportedCurrencies: supportedCurrencies.map(c => c.toUpperCase()) // TODO backend to give us this uc
  }));
};

export default getProviders;
