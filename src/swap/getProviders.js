// @flow

import type { GetExchangeRates } from "./types";
import network from "../network";
import { swapAPIBaseURL } from "./";
import { getEnv } from "../env";
import { mockedGetProviders } from "./mock";

const getProviders: GetExchangeRates = async () => {
  if (!getEnv("MOCK")) {
    const res = await network({
      method: "GET",
      url: `${swapAPIBaseURL}/providers`
    });

    if (res.data) {
      return res.data;
    }

    throw new Error("getProviders: Something broke");
  } else {
    return mockedGetProviders();
  }
};

export default getProviders;
