import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useContext,
} from "react";
import type { PlatformAppContextType, Props, State } from "./types";
import api from "./api";
import type { AppManifest } from "../types";

// @ts-expect-error empty object creates an error
const PlatformAppContext = createContext<PlatformAppContextType>({});
const initialState: State = {
  localManifests: new Map(),
  remoteManifests: new Map(),
  catalog: undefined,
  isLoading: false,
  lastUpdateTime: undefined,
  error: undefined,
};
const AUTO_UPDATE_DEFAULT_DELAY = 1800 * 1000; // 1800 seconds

export function usePlatformApp(): PlatformAppContextType {
  return useContext(PlatformAppContext);
}
export function PlatformAppProvider({
  autoUpdateDelay,
  platformAppsServerURL,
  platformCatalogServerURL,
  children,
}: Props) {
  const [state, setState] = useState<State>(initialState);

  const addLocalManifest = useCallback((manifest: AppManifest) => {
    setState((previousState) => ({
      ...previousState,
      localManifests: new Map(previousState.localManifests).set(
        manifest.id,
        manifest
      ),
    }));
  }, []);

  const removeLocalManifest = useCallback((id: string) => {
    setState((previousState) => {
      const newLocalManifests = new Map(previousState.localManifests);
      newLocalManifests.delete(id);
      return {
        ...previousState,
        localManifests: newLocalManifests,
      };
    });
  }, []);

  const updateData = useCallback(async () => {
    try {
      setState((previousState) => ({
        ...previousState,
        isLoading: true,
      }));

      const [remoteManifestList, catalog] = await Promise.all([
        api.fetchManifest(platformAppsServerURL),
        api.fetchCatalog(platformCatalogServerURL),
      ]);
      const remoteManifests = new Map();
      for (let i = 0; i < remoteManifestList.length; i++) {
        const currentManifest = remoteManifestList[i];
        remoteManifests.set(currentManifest.id, currentManifest);
      }

      setState((previousState) => ({
        ...previousState,
        catalog,
        remoteManifests,
        isLoading: false,
        lastUpdateTime: Date.now(),
        error: undefined,
      }));
    } catch (error: any) {
      setState((previousState) => ({
        ...previousState,
        isLoading: false,
        error,
      }));
    }
  }, [platformAppsServerURL, platformCatalogServerURL]);

  useEffect(() => {
    updateData();
  }, [updateData]);
  useEffect(() => {
    const intervalInstance = setInterval(
      updateData,
      autoUpdateDelay !== undefined
        ? autoUpdateDelay
        : AUTO_UPDATE_DEFAULT_DELAY
    );
    return () => clearInterval(intervalInstance);
  }, [autoUpdateDelay, updateData]);

  const value = useMemo(() => {
    const manifests = new Map([
      ...state.remoteManifests,
      ...state.localManifests,
    ]);
    return {
      ...state,
      manifests,
      updateData,
      addLocalManifest,
      removeLocalManifest,
    };
  }, [state, updateData, removeLocalManifest, addLocalManifest]);

  return (
    <PlatformAppContext.Provider value={value}>
      {children}
    </PlatformAppContext.Provider>
  );
}
