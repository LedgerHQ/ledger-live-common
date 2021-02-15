// @flow
import network from "../network";
import type { Announcement } from "./types";

// expose a function to fetch data from the cdn (data from ledger-live-assets)
// https://cdn.live.ledger.com/

const BASE_URL = "https://cdn.live.ledger.com/announcements";
const VERSION = "v1";

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  const url = `${BASE_URL}/${VERSION}/data.json`;

  const { data } = await network({
    method: "GET",
    url,
  });
  return data;
};
