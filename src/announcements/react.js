// @flow
import uniq from "lodash/uniq";
import intersection from "lodash/intersection";
import difference from "lodash/difference";
import React, {
  createContext,
  useReducer,
  useMemo,
  useContext,
  useEffect,
} from "react";
import type { Announcement } from "./types";
import { fetchAnnouncements } from "./logic";
// import { createSelector } from "reselect";

type Filters = {
  language: string,
  currencies: string[],
  date: Date,
};

type Props = {
  children: React$Node,
  onNewAnnoucement: (string) => void,
  onLoad: () => Promise<Announcement[]>,
  onSave: (Announcement[]) => void,
  filters: Filters,
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
  allIds: [],
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
      const allIds = Object.keys(cache);
      const seenIds = intersection(allIds, state.seenIds);
      return {
        ...state,
        cache,
        seenIds,
        allIds,
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
  const { language, currencies, date } = filters;

  const filtered = announcements.filter((announcement) => {
    if (announcement?.language !== language) {
      return false;
    }
    if (!announcement?.currencies?.some((c) => currencies.includes(c))) {
      return false;
    }

    const publishedAt = new Date(announcement.published_at);
    if (publishedAt.getTime() > date.getTime()) {
      return false;
    }

    if (
      announcement.expired_at &&
      new Date(announcement.expired_at).getTime() < date.getTime()
    ) {
      return false;
    }

    return true;
  });

  return filtered;
}

function getFreshAnnouncements(oldIds, newIds) {
  return difference(oldIds, newIds);
}

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
  filters,
  onNewAnnoucement, // FOR THE TOAST
  onLoad, // LOAD ANNOUNCEMENTS FROM DB
  onSave, // SAVE ANNOUNCEMENTS TO DB
}: Props) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const api = useMemo(
    () => ({
      updateCache: async () => {
        dispatch({ type: "updateCachePending" });
        try {
          const allAnnouncements = await fetchAnnouncements();
          const announcements = filterAnnouncements(allAnnouncements, filters);
          const newIds = announcements.map((a) => a.uuid);
          const freshIds = getFreshAnnouncements(state.allIds, newIds);
          freshIds.forEach((id) => onNewAnnoucement(id));
          dispatch({ type: "updateCacheSuccess", announcements });
          onSave(announcements);
        } catch (e) {
          dispatch({ type: "updateCacheError", error: e });
        }
      },
      setAsSeen: (seenIds: string[]) => {
        dispatch({ type: "setAsSeen", seenIds });
      },
    }),
    [dispatch, filters, state.allIds, onNewAnnoucement, onSave]
  );

  // onDidMount
  useEffect(() => {
    onLoad().then((announcements) => {
      dispatch({ type: "updateCacheSuccess", announcements });
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

export const useAnnouncements = (): Context => useContext(AnnoucementsContext);
