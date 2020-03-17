// @flow

import network from "../network";
import { swapAPIBaseURL } from "./";
import type { GetStatus } from "./types";
import { getEnv } from "../env";
import { mockGetStatus } from "./mock";

// Nb Depending on how we implement this we might want to send an array
// Not using that signature since we initially talked about a single status check
const getStatus: GetStatus = async (provider: string, swapId: string) => {
  if (getEnv("MOCK")) return mockGetStatus(provider, swapId);

  const res = await network({
    method: "POST",
    url: `${swapAPIBaseURL}/swap/status`,
    data: [
      {
        provider,
        swapId
      }
    ]
  });

  return res.data.map(({ provider, swapId, status }) => {
    return { provider, swapId, status };
  });
};

export default getStatus;
