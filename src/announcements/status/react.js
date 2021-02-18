// @flow
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
import type { StatusIncident, RawStatusSummary } from "../types";
import { fetchStatusSummary } from "./logic";

type Props = {
  children: React$Node,
};

type State = {
  incidents: StatusIncident[],
  initialized: boolean,
  isLoading: boolean,
};

type API = {
  updateData: () => Promise<void>,
};

export type StatusContextType = State & API;

type UpdateDataSuccessAction = {
  type: "updateDataSuccess",
  incidents: StatusIncident[],
};

type UpdateDataErrorAction = {
  type: "updateDataError",
  error: Error,
};

type UpdateDataPendingAction = {
  type: "updateDataPending",
};

type Action =
  | UpdateDataSuccessAction
  | UpdateDataErrorAction
  | UpdateDataPendingAction;

const LedgerStatusContext = createContext<StatusContextType>({});

const initialState: State = {
  incidents: [],
  initialized: false,
  isLoading: false,
};
const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "updateDataSuccess": {
      return {
        ...state,
        incidents: action.incidents,
        initialized: true,
        isLoading: false,
      };
    }

    case "updateDataError": {
      return {
        ...state,
        error: action.error,
        isLoading: false,
      };
    }

    case "updateDataPending": {
      return {
        ...state,
        isLoading: true,
      };
    }

    default:
      return state;
  }
};

function formatRawStatus(rawStatusSummary: RawStatusSummary): StatusIncident[] {
  const incidents = rawStatusSummary.incidents || [];
  return incidents.map((i) => ({
    uuid: i.id,
    icon: i.impact === "none" ? "info" : "warning",
    level: i.impact === "none" ? "info" : "warning",
    published_at: i.created_at,
    content: {
      title: i.name,
      text:
        i.incident_updates && i.incident_updates[0]
          ? i.incident_updates[0].body
          : null,
      link: i.shortlink ? { href: i.shortlink, label: "Learn more" } : null,
    },
    status: i.status,
  }));
}

export const LedgerStatusProvider = ({ children }: Props) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const updateData = useCallback(async () => {
    dispatch({ type: "updateDataPending" });
    try {
      const rawStatusReport = await fetchStatusSummary();
      const statusIncidents = formatRawStatus(rawStatusReport);
      dispatch({ type: "updateDataSuccess", incidents: statusIncidents });
    } catch (e) {
      dispatch({ type: "updateDataError", error: e });
    }
  }, []);

  const api = useMemo(
    () => ({
      updateData,
    }),
    [updateData]
  );

  // onDidMount
  useEffect(() => {
    updateData();
  }, []); /* eslint-disable-line */

  const value = {
    ...state,
    ...api,
  };

  return (
    <LedgerStatusContext.Provider value={value}>
      {children}
    </LedgerStatusContext.Provider>
  );
};

export const useLedgerStatus = (): StatusContextType =>
  useContext(LedgerStatusContext);

export const useNewLedgerStatus = ({
  incidents,
}: StatusContextType): [
  StatusIncident[],
  (uuid: string) => void,
  () => void
] => {
  const currentIds = useRef(() => incidents.map(({ uuid }) => uuid));
  const [newLedgerStatus, setNewLedgerStatus] = useState([]);

  useEffect(() => {
    const allIds = incidents.map(({ uuid }) => uuid);
    const diff = allIds.filter((id) => !currentIds.current.includes(id));
    if (diff.length > 0) {
      currentIds.current = allIds;
      setNewLedgerStatus((state) => [
        ...diff.map((id) => incidents.find(({ uuid }) => uuid === id)),
        ...state,
      ]);
    }
  }, [incidents, currentIds]);

  const clearStatus = useCallback((uuid: string) => {
    setNewLedgerStatus((state) => state.filter((a) => a.uuid !== uuid));
  }, []);

  const clearAllStatus = useCallback(() => {
    setNewLedgerStatus([]);
  }, []);

  return [newLedgerStatus, clearStatus, clearAllStatus];
};
