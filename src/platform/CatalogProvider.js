// @flow

import React, { useContext, useEffect, useMemo, useState } from "react";

import type { AppManifest, AppBranch } from "./types";

import manifest from "./manifest";

type State = {
  apps: AppManifest[],
};

type Props = {
  children: React$Node,
};

const initialState = {
  apps: [],
};

export const PlatformCatalogContext = React.createContext<State>(initialState);

const PlatformCatalogProvider = ({ children }: Props) => {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState({ apps: manifest });
  }, []);

  return (
    <PlatformCatalogContext.Provider value={state}>
      {children}
    </PlatformCatalogContext.Provider>
  );
};

export const useCatalog = (branches: AppBranch[] = ["stable"]) => {
  const context = useContext(PlatformCatalogContext);
  if (context === undefined) {
    throw new Error("useCatalog must be used within a PlatformCatalogContext");
  }

  const apps = useMemo(
    (): AppManifest[] =>
      context.apps.filter((app) => branches.indexOf(app.branch) > -1),
    [context.apps, branches]
  );

  return {
    ...context,
    apps,
  };
};

export const useAppManifest = (platformId: string) => {
  const context = useContext(PlatformCatalogContext);
  if (context === undefined) {
    throw new Error(
      "useAppManifest must be used within a PlatformCatalogContext"
    );
  }

  const manifest = useMemo(
    () => context.apps.find((app) => app.id === platformId),
    [context.apps, platformId]
  );

  return manifest;
};

export default PlatformCatalogProvider;
