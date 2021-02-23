// @flow

import { getEnv } from "../../env";
import network from "../../network";
import type {
  RawAnnouncement,
  RawStatusSummary,
  AnnouncementsApi,
} from "../types";

// expose a function to fetch data from the cdn (data from ledger-live-assets)
// https://cdn.live.ledger.com/

const baseAnnouncementsUrl = () => getEnv("ANNOUNCEMENTS_API_URL");
const announcementsVersion = () => getEnv("ANNOUNCEMENTS_API_VERSION");

async function fetchAnnouncements(): Promise<RawAnnouncement[]> {
  const url = `${baseAnnouncementsUrl()}/v${announcementsVersion()}/data.json`;

  const { data } = await network({
    method: "GET",
    url,
  });
  return data;
}

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

const api: AnnouncementsApi = {
  fetchAnnouncements,
  fetchStatusSummary,
};

export default api;
