// @flow

import type { AppManifest } from "../types";

export type State = {
  manifests: AppManifest[],
  manifestById: { [id: string]: AppManifest },
  isLoading: boolean,
  lastUpdateTime: ?number,
  error: ?Error,
};

export type Props = {
  children: React$Node,
  autoUpdateDelay?: number,
  extraManifests?: AppManifest[],
  platformAppsServerURL: string,
};

export type API = {
  updateData: () => Promise<void>,
};

export type PlatformAppContextType = State & API;

export type PlatformApi = {
  fetchManifest: (url: string) => Promise<AppManifest[]>,
};
