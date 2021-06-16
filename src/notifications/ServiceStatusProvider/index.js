// @flow

import React, { createContext, useContext, useMemo, useCallback } from "react";
import type { State, ServiceStatusUserSettings, Incident } from "./types";
import networkApi from "./api";
import { useMachine } from "@xstate/react";
import { serviceStatusMachine } from "./machine";

type Props = {
  children: React$Node,
  autoUpdateDelay: number,
  context: ServiceStatusUserSettings,
};

type API = {
  updateData: () => Promise<void>,
};

export type StatusContextType = State & API;

const ServiceStatusContext = createContext<StatusContextType>({});

export function useServiceStatus(): StatusContextType {
  return useContext(ServiceStatusContext);
}

export function filterServiceStatusIncidents(
  incidents: Incident[],
  currencies: string[] = []
): Incident[] {
  if (!currencies || currencies.length === 0) return [];

  const currenciesRegex = new RegExp(currencies.join("|"), "i");
  return incidents.filter((inc) => currenciesRegex.test(inc.name));
}

// filter out service status incidents by given currencies or fallback on context currencies
export function useFilteredServiceStatus(
  filters: ServiceStatusUserSettings = {}
): StatusContextType {
  const stateData = useContext(ServiceStatusContext);
  const { incidents, context } = stateData;

  const filteredIncidents = useMemo(() => {
    return filterServiceStatusIncidents(
      incidents,
      filters.currencies || context.currencies
    );
  }, [incidents, context, filters.currencies]);

  return { ...stateData, incidents: filteredIncidents };
}

export const ServiceStatusProvider = ({
  children,
  autoUpdateDelay,
  context,
}: Props) => {
  const fetchData = useCallback(async () => {
    const serviceStatusSummary = await networkApi.fetchStatusSummary();

    return {
      incidents: serviceStatusSummary.incidents,
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
    context,
  };

  return (
    <ServiceStatusContext.Provider value={value}>
      {children}
    </ServiceStatusContext.Provider>
  );
};
