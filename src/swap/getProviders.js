// @flow

import type { GetProviders } from "./types";
import network from "../network";
import { swapAPIBaseURL } from "./";
import { getEnv } from "../env";
import { mockedGetProviders } from "./mock";

const getProviders: GetProviders = async () => {
  if (!getEnv("MOCK")) {
    const res = await network({
      method: "GET",
      url: `${swapAPIBaseURL}/providers`
    });

    if (res.data) {
      return res.data.map(({ provider, supportedCurrencies }) => ({
        provider,
        supportedCurrencies: supportedCurrencies.map(c => c.toUpperCase()) // TODO backend to give us this uc
      }));
    }

    throw new Error("getProviders: Something broke");
  } else {
    return mockedGetProviders();
  }
};

export default getProviders;
