// @flow

import { assign, Machine } from "xstate";
import intersection from "lodash/intersection";
import type { State } from "./types";

const initialState: State = {
  cache: {},
  seenIds: [],
  allIds: [],
  error: null,
  lastUpdateTime: null,
  isLoading: false,
};

export const announcementMachine = Machine(
  {
    id: "announcement",
    initial: "loading",
    context: initialState,
    states: {
      loading: {
        invoke: {
          src: "loadData",
          onDone: {
            target: "idle",
            actions: assign((_, { data }) => {
              const { announcements, seenIds, lastUpdateTime } = data;

              const cache = {};
              announcements.forEach((announcement) => {
                cache[announcement.uuid] = announcement;
              });

              const allIds = Object.keys(cache);

              return {
                allIds,
                cache,
                seenIds,
                lastUpdateTime,
              };
            }),
          },
        },
      },
      idle: {
        on: {
          UPDATE_DATA: {
            target: "updating",
            actions: assign({ isLoading: true, error: null }),
          },
        },
      },
      updating: {
        invoke: {
          src: "updateData",
          onDone: {
            target: "idle",
            actions: [
              assign((context, { data }) => {
                const { announcements, updateTime } = data;

                const cache = {};
                announcements.forEach((announcement) => {
                  cache[announcement.uuid] = announcement;
                });

                const allIds = Object.keys(cache);

                return {
                  cache,
                  seenIds: intersection(allIds, context.seenIds),
                  allIds,
                  lastUpdateTime: updateTime,
                  isLoading: false,
                  error: null,
                };
              }),
              "saveData",
            ],
          },
          onError: {
            target: "idle",
            actions: assign((_, { data }) => ({
              error: data,
            })),
          },
        },
      },
    },
    on: {
      SET_AS_SEEN: {
        cond: (context, event) => !context.seenIds.includes(event.seenId),
        actions: ["setAsSeen", "saveData"],
      },
    },
  },
  {
    actions: {
      setAsSeen: assign((context, event) => ({
        seenIds: [...context.seenIds, event.seenId],
      })),
    },
  }
);
