import network from "../../../network";
import type { AppManifest, CatalogMetadata } from "../../types";
import type { PlatformApi } from "../types";

// expose a function to fetch data from the cdn (data from ledger-live-assets)
// https://cdn.live.ledger.com/

async function fetchManifest(
  platformAppsServerURL: string
): Promise<AppManifest[]> {
  const url = `${platformAppsServerURL}?t=${Date.now()}`;

  const { data } = await network({
    method: "GET",
    headers: {
      Origin: "http://localhost:3000",
    },
    url,
  });
  return data;
}

async function fetchCatalog(
  platformCatalogServerURL: string
): Promise<CatalogMetadata> {
  const url = `${platformCatalogServerURL}?t=${Date.now()}`;

  const { data } = await network({
    method: "GET",
    headers: {
      Origin: "http://localhost:3000",
    },
    url,
  });
  return data;
}

const api: PlatformApi = {
  fetchManifest,
  fetchCatalog,
};
export default api;
