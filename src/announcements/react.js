// @flow
import uniq from "lodash/uniq";
import intersection from "lodash/intersection";
import React, { createContext, useReducer, useMemo, useContext } from "react";
import type { Announcement } from "./types";
import { fetchAnnouncements } from "./logic";

// fetch data
// expose data to client
// seen / unseen logic
// expose a load / save function for new announcements and seen

type Filters = {
  language: string,
  currencies: string[],
};

type Props = {
  children: React$Node,
  filters: Filters,
};

type Cache = {
  [id: string]: Announcement,
};

type State = {
  seenIds: string[],
  cache: Cache,
  isLoading: boolean,
  error: ?Error,
};

type API = {
  updateCache: () => Promise<void>,
  setAsSeen: (seenIds: string[]) => void,
};

type Context = State & API;

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

type Action =
  | SetAsSeenAction
  | UpdateCacheSuccessAction
  | UpdateCacheErrorAction
  | UpdateCachePendingAction;

const AnnoucementsContext = createContext<Context>({});

const initialState: State = {
  cache: {},
  seenIds: [],
  error: null,
  isLoading: false,
};
const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "setAsSeen":
      return {
        ...state,
        seenIds: uniq([...state.seenIds, ...action.seenIds]),
      };

    case "updateCacheSuccess": {
      const cache = action.announcements.reduce((acc, curr) => {
        acc[curr.uuid] = curr;
        return acc;
      }, {});
      const allKeys = Object.keys(cache);
      const seenIds = intersection(allKeys, state.seenIds);
      return {
        ...state,
        cache,
        seenIds,
        isLoading: false,
        error: null,
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

function filterAnnouncements(
  announcements: Announcement[],
  filters: Filters
): Announcement[] {
  if (filters) {
    // Do the magic
    return announcements;
  }

  return announcements;
}

export const AnnoucementProvider = ({ children, filters }: Props) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const api = useMemo(
    () => ({
      updateCache: async () => {
        dispatch({ type: "updateCachePending" });
        try {
          const allAnnouncements = await fetchAnnouncements();
          const announcements = filterAnnouncements(allAnnouncements, filters);
          dispatch({ type: "updateCacheSuccess", announcements });
        } catch (e) {
          dispatch({ type: "updateCacheError", error: e });
        }
      },
      setAsSeen: (seenIds: string[]) => {
        dispatch({ type: "setAsSeen", seenIds });
      },
    }),
    [dispatch, filters]
  );

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

export const useAnnouncements = (): Context => useContext(AnnoucementsContext);
