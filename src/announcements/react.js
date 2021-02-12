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
} from "react";
import type { Announcement } from "./types";
import { fetchAnnouncements } from "./logic";

type Context = {
  language: string,
  currencies: string[],
  getDate: () => Date,
};

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
  context: Context,
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

type AnnouncementContextType = State & API;

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

    case "loadCache": {
      const cache = action.announcements.reduce((acc, curr) => {
        acc[curr.uuid] = curr;
        return acc;
      }, {});
      const allIds = Object.keys(cache);
      const seenIds = action.seenIds;
      return {
        ...state,
        cache,
        seenIds,
        allIds,
        isLoading: false,
        error: null,
      };
    }

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
  context: Context
): Announcement[] {
  const { language, currencies, getDate } = context;

  const date = getDate();

  return announcements.filter((announcement) => {
    if (announcement.language && announcement.language !== language) {
      return false;
    }

    if (
      announcement.currencies &&
      !announcement.currencies.some((c) => currencies.includes(c))
    ) {
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
          const allAnnouncements = await fetchAnnouncements();
          const announcements = filterAnnouncements(allAnnouncements, context);
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
  }, [cache, seenIds]);

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
