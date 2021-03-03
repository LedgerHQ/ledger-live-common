// @flow

import { getEnv } from "../../../env";
import network from "../../../network";
import type { RawStatusSummary, ServiceStatusApi } from "../types";

const baseStatusUrl = () => getEnv("STATUS_API_URL");
const statusVersion = () => getEnv("STATUS_API_VERSION");

async function fetchStatusSummary(): Promise<RawStatusSummary> {
  const url = `${baseStatusUrl()}/v${statusVersion()}/summary.json`;

  const { data } = await network({
    method: "GET",
    url,
  });
  return data;
}

const api: ServiceStatusApi = {
  fetchStatusSummary,
};

export default api;
