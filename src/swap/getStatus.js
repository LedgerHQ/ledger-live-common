// @flow

import network from "../network";
import { swapAPIBaseURL } from "./";
import type { GetSwapStatus } from "./types";

// Nb Depending on how we implement this we might want to send an array
// Not using that signature since we initially talked about a single status check
const getStatus: GetSwapStatus = async (provider: string, swapId: string) => {
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

  if (res.data) {
    return res.data.map(({ provider, swapId, status }) => {
      return { provider, swapId, status };
    });
  }

  throw new Error("getStatus: Something broke");
};

export default getStatus;
