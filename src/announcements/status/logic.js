// @flow
import { getEnv } from "../../env";
import network from "../../network";
import type { RawStatusSummary } from "../types";

// expose a function to fetch data from the status page api (data from ledger.statuspage.io)
// https://ledger.statuspage.io/api

const BASE_URL = getEnv("STATUS_API_URL");
const VERSION = getEnv("STATUS_API_VERSION");

export const fetchStatusSummary = async (): Promise<RawStatusSummary> => {
  const url = `${BASE_URL}/v${VERSION}/summary.json`;

  const { data } = await network({
    method: "GET",
    url,
  });
  return data;
};
