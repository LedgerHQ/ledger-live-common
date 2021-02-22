// @flow

import { getEnv } from "../../env";
import network from "../../network";
import type { RawAnnouncement, AnnouncementsApi } from "../types";

// expose a function to fetch data from the cdn (data from ledger-live-assets)
// https://cdn.live.ledger.com/

const baseUrl = () => getEnv("ANNOUNCEMENTS_API_URL");
const version = () => getEnv("ANNOUNCEMENTS_API_VERSION");

async function fetchAnnouncements(): Promise<RawAnnouncement[]> {
  const url = `${baseUrl()}/v${version()}/data.json`;

  const { data } = await network({
    method: "GET",
    url,
  });
  return data;
}

const api: AnnouncementsApi = {
  fetchAnnouncements,
};

export default api;
