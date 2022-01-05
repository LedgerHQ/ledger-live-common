import type { AppManifest, CatalogMetadata } from "../types";
export type State = {
  /** Remotely fetched manifests */
  remoteManifests: Map<string, AppManifest>;
  /** Locally added manifests */
  localManifests: Map<string, AppManifest>;
  /** Catalog metadata */
  catalogMetadata?: CatalogMetadata;
  /** Is remote manifests currently updating */
  isLoading: boolean;
  /** Is remote catalog metadata currently updating */
  isLoadingCatalog: boolean;
  /** Last update time */
  lastUpdateTime?: number;
  /** Last manifests update error */
  error: Error | null | undefined;
  /** Last catalog update error */
  errorCatalog: Error | null | undefined;
};
export type Props = {
  children: React.ReactNode;
  /** Interval between auto updates */
  autoUpdateDelay?: number;
  /** Remote server URL for fetching manifests */
  platformAppsServerURL: string;
  /** Remote server URL for fetching catalog metadata */
  platformCatalogServerURL?: string;
};
export type API = {
  /** Apps manifests */
  manifests: Map<string, AppManifest>;
  updateData: () => Promise<void>;
  addLocalManifest: (manifest: AppManifest) => void;
  removeLocalManifest: (id: string) => void;
};

export type PlatformAppContextType = State & API;

export type PlatformApi = {
  fetchManifest: (url: string) => Promise<AppManifest[]>;
  fetchCatalog: (url: string) => Promise<CatalogMetadata>;
};
