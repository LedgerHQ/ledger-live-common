import type { AppManifest } from "../types";
export type State = {
  manifests: AppManifest[];
  manifestById: Record<string, AppManifest>;
  isLoading: boolean;
  lastUpdateTime: number | null | undefined;
  error: Error | null | undefined;
};
export type Props = {
  children: React.ReactNode;
  autoUpdateDelay?: number;
  extraManifests?: AppManifest[];
};
export type API = {
  updateData: () => Promise<void>;
};
export type PlatformAppContextType = State & API;
