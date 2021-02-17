// @flow
import { getEnv } from "../env";
import network from "../network";
import type { RawAnnouncement } from "./types";

// expose a function to fetch data from the cdn (data from ledger-live-assets)
// https://cdn.live.ledger.com/

const BASE_URL = getEnv("ANNOUNCEMENTS_API_URL");
const VERSION = getEnv("ANNOUNCEMENTS_API_VERSION");

export const fetchAnnouncements = async (): Promise<RawAnnouncement[]> => {
  const url = `${BASE_URL}/v${VERSION}/data.json`;

  const { data } = await network({
    method: "GET",
    url,
  });
  return data;
};
