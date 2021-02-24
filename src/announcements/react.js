// @flow
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import type { Announcement, AnnoucementsUserSettings, State } from "./types";
import {
  groupAnnouncements,
  localizeAnnouncements,
  filterAnnouncements,
} from "./logic";
import fetchApi from "./api";
import { useMachine } from "@xstate/react";
import { announcementMachine } from "./machine";

type Props = {
  children: React$Node,
  onLoad: () => Promise<{
    announcements: Announcement[],
    seenIds: string[],
    lastUpdateTime: number,
  }>,
  onSave: ({
    announcements: Announcement[],
    seenIds: string[],
    lastUpdateTime: number,
  }) => Promise<void>,
  context: AnnoucementsUserSettings,
};

type API = {
  updateCache: () => Promise<void>,
  setAsSeen: (seenId: string) => void,
};

export type AnnouncementContextType = State & API;

const AnnoucementsContext = createContext<AnnouncementContextType>({});

export const AnnoucementProvider = ({
  children,
  context,
  onLoad, // LOAD ANNOUNCEMENTS FROM DB
  onSave, // SAVE ANNOUNCEMENTS TO DB
}: Props) => {
  const updateData = useCallback(async () => {
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
    const { announcements, lastUpdateTime, seenIds } = await onLoad();

    return {
      announcements,
      lastUpdateTime,
      seenIds,
    };
  }, [onLoad]);

  const saveData = useCallback(
    (context) => {
      const { cache, lastUpdateTime, seenIds, allIds } = context;
      const announcements = allIds.map((id: string) => cache[id]);
      onSave({ announcements, seenIds, lastUpdateTime });
    },
    [onSave]
  );

  const [state, send] = useMachine(announcementMachine, {
    actions: {
      saveData,
    },
    services: {
      loadData,
      updateData,
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
    <AnnoucementsContext.Provider value={value}>
      {children}
    </AnnoucementsContext.Provider>
  );
};

export const useAnnouncements = (): AnnouncementContextType =>
  useContext(AnnoucementsContext);

export const useGroupedAnnouncements = (cache: {
  [key: string]: Announcement,
}): { day: ?Date, data: Announcement[] }[] => {
  const groupedAnnouncements = useMemo(() => groupAnnouncements(cache), [
    cache,
  ]);

  return groupedAnnouncements;
};

export const useNewAnnouncements = ({
  cache,
  allIds,
}: AnnouncementContextType): [
  Announcement[],
  (uuid: string) => void,
  () => void
] => {
  const currentIds = useRef(allIds);
  const [newAnnouncements, setNewAnnouncements] = useState([]);

  useEffect(() => {
    const diff = allIds.filter((id) => !currentIds.current.includes(id));
    if (diff.length > 0) {
      currentIds.current = allIds;
      setNewAnnouncements((state) => [
        ...diff.map((id) => cache[id]),
        ...state,
      ]);
    }
  }, [allIds, cache, currentIds]);

  const clearAnnouncement = useCallback((uuid: string) => {
    setNewAnnouncements((state) => state.filter((a) => a.uuid !== uuid));
  }, []);

  const clearAllAnouncements = useCallback(() => {
    setNewAnnouncements([]);
  }, []);

  return [newAnnouncements, clearAnnouncement, clearAllAnouncements];
};
