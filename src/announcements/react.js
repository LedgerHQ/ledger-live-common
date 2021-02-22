// @flow
import uniq from "lodash/uniq";
import intersection from "lodash/intersection";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useCallback,
} from "react";
import type { Announcement, AnnoucementsUserSettings } from "./types";
import {
  groupAnnouncements,
  localizeAnnouncements,
  filterAnnouncements,
} from "./logic";
import fetchApi from "./api";

type Props = {
  children: React$Node,
  onLoad: () => Promise<{
    announcements: Announcement[],
    seenIds: string[],
  }>,
  onSave: ({
    announcements: Announcement[],
    seenIds: string[],
  }) => Promise<void>,
  context: AnnoucementsUserSettings,
};

type Cache = {
  [id: string]: Announcement,
};

type State = {
  seenIds: string[],
  allIds: string[],
  cache: Cache,
  isLoading: boolean,
  error: ?Error,
  initialized: boolean,
};

type API = {
  updateCache: () => Promise<void>,
  setAsSeen: (seenIds: string[]) => void,
};

export type AnnouncementContextType = State & API;

type SetAsSeenAction = { type: "setAsSeen", seenIds: string[] };

type UpdateCacheSuccessAction = {
  type: "updateCacheSuccess",
  announcements: Announcement[],
};

type UpdateCacheErrorAction = {
  type: "updateCacheError",
  error: Error,
};

type UpdateCachePendingAction = {
  type: "updateCachePending",
};

type LoadCacheAction = {
  type: "loadCache",
  announcements: Announcement[],
  seenIds: string[],
};

type Action =
  | SetAsSeenAction
  | UpdateCacheSuccessAction
  | UpdateCacheErrorAction
  | UpdateCachePendingAction
  | LoadCacheAction;

const AnnoucementsContext = createContext<AnnouncementContextType>({});

export const initialState: State = {
  cache: {},
  seenIds: [],
  allIds: [],
  error: null,
  isLoading: false,
  initialized: false,
};

export const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "setAsSeen":
      return {
        ...state,
        seenIds: uniq([...state.seenIds, ...action.seenIds]),
      };

    case "loadCache":
    case "updateCacheSuccess": {
      const cache = {};
      action.announcements.forEach((announcement) => {
        cache[announcement.uuid] = announcement;
      });
      const allIds = Object.keys(cache);
      const seenIds =
        action.type === "updateCacheSuccess"
          ? intersection(allIds, state.seenIds)
          : action.seenIds;
      return {
        ...state,
        cache,
        seenIds,
        allIds,
        isLoading: false,
        error: null,
        initialized: true,
      };
    }

    case "updateCacheError": {
      return {
        ...state,
        error: action.error,
        isLoading: false,
      };
    }

    case "updateCachePending": {
      return {
        ...state,
        isLoading: true,
      };
    }

    default:
      return state;
  }
};

// SELECTORS
// const getAllIds = (state) => state.allIds;
// const getSeenIds = (state) => state.seenIds;

// const getUnreadAnnouncementLength = createSelector(
//   getAllIds,
//   getSeenIds,
//   (allIds, seenIds) => allIds.length - seenIds.length
// );

export const AnnoucementProvider = ({
  children,
  context,
  onLoad, // LOAD ANNOUNCEMENTS FROM DB
  onSave, // SAVE ANNOUNCEMENTS TO DB
}: Props) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initialised = useRef(false);

  const { cache, seenIds, allIds } = state;

  const api = useMemo(
    () => ({
      updateCache: async () => {
        dispatch({ type: "updateCachePending" });
        try {
          const rawAnnouncements = await fetchApi.fetchAnnouncements();
          const localizedAnnouncements = localizeAnnouncements(
            rawAnnouncements,
            context
          );
          const announcements = filterAnnouncements(
            localizedAnnouncements,
            context
          );
          dispatch({ type: "updateCacheSuccess", announcements });
        } catch (e) {
          dispatch({ type: "updateCacheError", error: e });
        }
      },
      setAsSeen: (seenIds: string[]) => {
        dispatch({ type: "setAsSeen", seenIds });
      },
    }),
    [dispatch, context]
  );

  useEffect(() => {
    if (initialised.current) {
      const announcements = allIds.map((id: string) => cache[id]);
      onSave({ announcements, seenIds });
    }
  }, [cache, seenIds, onSave, allIds]);

  // onDidMount
  useEffect(() => {
    onLoad().then(({ announcements, seenIds }) => {
      dispatch({ type: "loadCache", announcements, seenIds });
      initialised.current = true;
    });
  }, []); /* eslint-disable-line */

  const value = {
    ...state,
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
