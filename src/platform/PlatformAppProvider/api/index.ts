import { getEnv } from "../../../env";
import type { PlatformApi } from "../types";
import prodApi from "./api";
import mockApi from "./api.mock";
const api: PlatformApi = {
  fetchManifest: (platformAppsServerURL: string) =>
    getEnv("MOCK")
      ? mockApi.fetchManifest(platformAppsServerURL)
      : prodApi.fetchManifest(platformAppsServerURL),
  fetchCatalog: (platformAppsCatalogURL: string) =>
    getEnv("MOCK")
      ? mockApi.fetchCatalog(platformAppsCatalogURL)
      : prodApi.fetchCatalog(platformAppsCatalogURL),
};
export default api;
