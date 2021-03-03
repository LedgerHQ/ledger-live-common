// @flow

import React, { createContext, useContext, useMemo, useCallback } from "react";
import type { State } from "./types";
import networkApi from "./api";
import { useMachine } from "@xstate/react";
import { serviceStatusMachine } from "./machine";

type Props = {
  children: React$Node,
  autoUpdateDelay: number,
};

type API = {
  updateData: () => Promise<void>,
};

export type StatusContextType = State & API;

const ServiceStatusContext = createContext<StatusContextType>({});

export const useServiceStatus = (): StatusContextType =>
  useContext(ServiceStatusContext);

export const ServiceStatusProvider = ({ children, autoUpdateDelay }: Props) => {
  const fetchData = useCallback(async () => {
    const rawStatusSummary = await networkApi.fetchStatusSummary();

    return {
      incidents: rawStatusSummary.incidents,
      updateTime: Date.now(),
    };
  }, []);

  const [state, send] = useMachine(serviceStatusMachine, {
    services: {
      fetchData,
    },
    delays: {
      AUTO_UPDATE_DELAY: autoUpdateDelay,
    },
  });

  const api = useMemo(
    () => ({
      updateData: async () => {
        send({ type: "UPDATE_DATA" });
      },
    }),
    [send]
  );

  const value = {
    ...state.context,
    ...api,
  };

  return (
    <ServiceStatusContext.Provider value={value}>
      {children}
    </ServiceStatusContext.Provider>
  );
};
