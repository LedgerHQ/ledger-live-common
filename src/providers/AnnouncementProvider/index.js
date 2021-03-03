// @flow

import React, { createContext, useMemo, useCallback, useContext } from "react";
import type { Announcement, AnnouncementsUserSettings, State } from "./types";
import { localizeAnnouncements, filterAnnouncements } from "./logic";
import fetchApi from "./api";
import { useMachine } from "@xstate/react";
import { announcementMachine } from "./machine";

type Props = {
  children: React$Node,
  handleLoad: () => Promise<{
    announcements: Announcement[],
    seenIds: string[],
    lastUpdateTime: number,
  }>,
  handleSave: ({
    announcements: Announcement[],
    seenIds: string[],
    lastUpdateTime: number,
  }) => Promise<void>,
  context: AnnouncementsUserSettings,
  autoUpdateDelay: number,
};

type API = {
  updateCache: () => Promise<void>,
  setAsSeen: (seenId: string) => void,
};

export type AnnouncementContextType = State & API;

const AnnouncementsContext = createContext<AnnouncementContextType>({});

export const useAnnouncements = (): AnnouncementContextType =>
  useContext(AnnouncementsContext);

export const AnnouncementProvider = ({
  children,
  context,
  handleLoad,
  handleSave,
  autoUpdateDelay,
}: Props) => {
  const fetchData = useCallback(async () => {
    const rawAnnouncements = await fetchApi.fetchAnnouncements();
    const localizedAnnouncements = localizeAnnouncements(
      rawAnnouncements,
      context
    );
    const announcements = filterAnnouncements(localizedAnnouncements, context);

    return {
      announcements,
      updateTime: Date.now(),
    };
  }, [context]);

  const loadData = useCallback(async () => {
    const { announcements, lastUpdateTime, seenIds } = await handleLoad();

    return {
      announcements,
      lastUpdateTime,
      seenIds,
    };
  }, [handleLoad]);

  const saveData = useCallback(
    (context) => {
      const { cache, lastUpdateTime, seenIds, allIds } = context;
      const announcements = allIds.map((id: string) => cache[id]);
      handleSave({ announcements, seenIds, lastUpdateTime });
    },
    [handleSave]
  );

  const [state, send] = useMachine(announcementMachine, {
    actions: {
      saveData,
    },
    services: {
      loadData,
      fetchData,
    },
    delays: {
      AUTO_UPDATE_DELAY: autoUpdateDelay,
    },
  });

  const api = useMemo(
    () => ({
      updateCache: async () => {
        send({ type: "UPDATE_DATA" });
      },
      setAsSeen: (seenId: string) => {
        send({ type: "SET_AS_SEEN", seenId });
      },
    }),
    [send]
  );

  const value = {
    ...state.context,
    ...api,
  };

  return (
    <AnnouncementsContext.Provider value={value}>
      {children}
    </AnnouncementsContext.Provider>
  );
};
