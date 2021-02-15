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
import type { Announcement, RawAnnouncement } from "./types";
import { fetchAnnouncements } from "./logic";

type UserSettings = {
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
  context: UserSettings,
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

function localizeAnnouncements(
  rawAnnouncements: RawAnnouncement[],
  context: UserSettings
): Announcement[] {
  return rawAnnouncements.map((rawAnnouncement: RawAnnouncement) => ({
    ...rawAnnouncement,
    content:
      rawAnnouncement.content[context.language] ||
      rawAnnouncement.content["en"],
  }));
}

function filterAnnouncements(
  announcements: Announcement[],
  context: UserSettings
): Announcement[] {
  const { language, currencies, getDate } = context;

  const date = getDate();

  return announcements.filter((announcement) => {
    if (announcement.languages && !announcement.languages.includes(language)) {
      return false;
    }

    if (
      announcement.currencies &&
      !announcement.currencies.some((c) => currencies.includes(c))
    ) {
      return false;
    }

    const publishedAt = new Date(announcement.published_at);
    if (publishedAt > date) {
      return false;
    }

    if (announcement.expired_at && new Date(announcement.expired_at) < date) {
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
          const rawAnnouncements = await fetchAnnouncements();
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

function startOfDayTime(date: string): number {
  const d = new Date(date);
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return startOfDate.getTime();
}

export const useGroupedAnnouncements = (cache: {
  [key: string]: Announcement,
}): { day: ?string, data: Announcement[] }[] => {
  const groupedAnnouncements = useMemo(() => {
    // first group by published_at or if theres a priority set
    const announcementsByDayOrPriority: {
      [key: string]: Announcement[],
    } = Object.keys(cache).reduce((sum, uuid: string) => {
      const announcement = cache[uuid];

      // group by publication date or if priority set in a group 0
      const k = isNaN(announcement.priority)
        ? startOfDayTime(announcement.published_at)
        : 0;

      return {
        ...sum,
        [`${k}`]: [...(sum[k] || []), announcement],
      };
    }, {});

    // map over the keyed groups and sort them by priority and date
    return Object.keys(announcementsByDayOrPriority)
      .filter(
        (key) =>
          announcementsByDayOrPriority[key] &&
          announcementsByDayOrPriority[key].length > 0 // filter out potential empty groups
      )
      .map((key) => Number(key)) // map every string to a number for sort evaluation
      .sort((a, b) => {
        const aa = a === 0 ? Infinity : a; // sort out by timestamp key while keeping priority set announcements on top
        const bb = b === 0 ? Infinity : b; // this can work because a and b cannot be equal to 0 at same time
        return bb - aa;
      })
      .map((date) => ({
        day: date === 0 ? null : new Date(date).toLocaleDateString(), // format Day if available
        data: announcementsByDayOrPriority[`${date}`].sort(
          (a, b) => (a.priority || 0) - (b.priority || 0)
        ), // resort data by priority if it is set
      }));
  }, [cache]);

  return groupedAnnouncements;
};
