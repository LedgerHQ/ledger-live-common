// @flow
import { getEnv } from "../../env";
import type { AnnouncementsApi } from "../types";
import prodApi from "./api";
import mockApi from "./api.mock";

const api: AnnouncementsApi = {
  fetchAnnouncements: () =>
    getEnv("MOCK")
      ? mockApi.fetchAnnouncements()
      : prodApi.fetchAnnouncements(),
  fetchStatusSummary: () =>
    getEnv("MOCK")
      ? mockApi.fetchStatusSummary()
      : prodApi.fetchStatusSummary(),
};

export default api;
