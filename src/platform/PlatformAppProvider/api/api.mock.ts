import type { AppManifest, Catalog } from "../../types";
import type { PlatformApi } from "../types";
import { appManifests } from "./mockData/mockAppManifests";
import { catalog } from "./mockData/mockCatalog";

async function fetchManifest(): Promise<AppManifest[]> {
  return Promise.resolve(appManifests);
}

async function fetchCatalog(): Promise<Catalog> {
  return Promise.resolve(catalog);
}

const api: PlatformApi = {
  fetchManifest,
  fetchCatalog,
};

export default api;
