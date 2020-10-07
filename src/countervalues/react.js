// @flow
import React, {
  createContext,
  useMemo,
  useContext,
  useEffect,
  useReducer,
  useState,
  useRef,
} from "react";
import type { Currency } from "../types";
import {
  initialState,
  calculate,
  calculateMany,
  loadCountervalues,
  exportCountervalues,
} from "./logic";
import type {
  CounterValuesState,
  CounterValuesStateRaw,
  CountervaluesSettings,
} from "./types";

// Polling is the control object you get from the high level <PollingConsumer>{ polling => ...
export type Polling = {
  // completely wipe all countervalues
  wipe: () => void,
  // one shot poll function
  // TODO: is there any usecases returning promise here?
  // It's a bit tricky to return Promise with current impl
  poll: () => void,
  // start background polling
  start: () => void,
  // stop background polling
  stop: () => void,
  // true when the polling is in progress
  pending: boolean,
  // if the last polling failed, there will be an error
  error: ?Error,
};

export type Props = {
  initialCountervalues: ?CounterValuesState,
  children: React$Node,
  userSettings: CountervaluesSettings,
  // the time to wait before the first poll when app starts (allow things to render to not do all at boot time)
  pollInitDelay?: number,
  // the minimum time to wait before two automatic polls (then one that happen whatever network/appstate events)
  autopollInterval?: number,
  startPollingImmediately?: boolean,
};

const CountervaluesPollingContext = createContext<Polling>({
  wipe: () => {},
  poll: () => {},
  start: () => {},
  stop: () => {},
  pending: false,
  error: null,
});

const CountervaluesContext = createContext<CounterValuesState>(initialState);

export const Countervalues = ({
  initialCountervalues,
  children,
  userSettings,
  pollInitDelay = 1 * 1000,
  autopollInterval = 120 * 1000,
  startPollingImmediately = true,
}: Props) => {
  const [{ state, pending, error }, dispatch] = useReducer<FetchState, Action>(
    fetchReducer,
    initialFetchState
  );

  // trigger poll but not every time poll callback is changed
  const [triggerPoll, setTriggerPoll] = useState(false);

  useEffect(() => {
    if (pending || !triggerPoll) return;
    dispatch({ type: "pending" });
    loadCountervalues(state, userSettings).then(
      (state) => {
        dispatch({ type: "success", payload: state });
        setTriggerPoll(false);
      },
      (error) => {
        dispatch({ type: "success", payload: error });
        setTriggerPoll(false);
      }
    );
  }, [pending, state, userSettings, triggerPoll]);

  // trigger poll for the frist render and when userSettings is not exactly the same
  const isFirstRender = useRef(true);
  const userSettingsRef = useRef(userSettings);
  useEffect(() => {
    if (isFirstRender) {
      isFirstRender.current = false;
    } else {
      if (
        JSON.stringify(userSettings) === JSON.stringify(userSettingsRef.current)
      )
        return;
    }
    setTriggerPoll(true);
    userSettingsRef.current = userSettings;
  }, [userSettings]);

  const [isPolling, setIsPolling] = useState(startPollingImmediately);
  useEffect(() => {
    if (!isPolling) return;

    let pollingTimeout;

    function pollingLoop() {
      setTriggerPoll(true);
      pollingTimeout = setTimeout(pollingLoop, autopollInterval);
    }
    pollingTimeout = setTimeout(pollingLoop, pollInitDelay);
    return () => clearTimeout(pollingTimeout);
  }, [autopollInterval, pollInitDelay, isPolling]);

  // update countervalues by cache from local store when it's retrieved asynchronously
  useEffect(() => {
    if (!initialCountervalues) return;
    dispatch({
      type: "setCachedCounterValueState",
      payload: initialCountervalues,
    });
  }, [initialCountervalues]);

  const polling = useMemo<Polling>(
    () => ({
      wipe: () => {
        dispatch({ type: "wipe" });
      },
      poll: () => setTriggerPoll(true),
      start: () => setIsPolling(true),
      stop: () => setIsPolling(false),
      pending,
      error,
    }),
    [pending, error]
  );

  return (
    <CountervaluesPollingContext.Provider value={polling}>
      <CountervaluesContext.Provider value={state}>
        {children}
      </CountervaluesContext.Provider>
    </CountervaluesPollingContext.Provider>
  );
};

type Action =
  | {
      type: "success",
      payload: CounterValuesState,
    }
  | {
      type: "error",
      payload: Error,
    }
  | {
      type: "pending",
    }
  | {
      type: "wipe",
    }
  | {
      type: "setCachedCounterValueState",
      payload: CounterValuesState,
    };

type FetchState = {
  state: CounterValuesState,
  pending: boolean,
  error?: Error,
};

const initialFetchState: FetchState = { state: initialState, pending: false };

function fetchReducer(state, action) {
  switch (action.type) {
    case "success":
      return { state: action.payload, pending: false, error: undefined };
    case "error":
      return { ...state, pending: false, error: action.payload };
    case "pending":
      return { ...state, pending: true, error: undefined };
    case "wipe":
      return { state: initialState, pending: false, error: undefined };
    case "setCachedCounterValueState":
      return { ...state, state: action.payload };
    default:
      return state;
  }
}

export function useCountervaluesPolling(): Polling {
  const polling = useContext(CountervaluesPollingContext);
  return polling;
}

export function useCountervaluesState(): CounterValuesState {
  const s = useContext(CountervaluesContext);
  return s;
}

export function useCountervaluesExport(): CounterValuesStateRaw {
  const state = useContext(CountervaluesContext);
  const exported = useMemo(() => exportCountervalues(state), [state]);
  return exported;
}

export function useCalculate(query: {
  value: number,
  from: Currency,
  to: Currency,
  disableRounding?: boolean,
  date?: ?Date,
  reverse?: boolean,
}): ?number {
  const state = useCountervaluesState();
  return calculate(state, query);
}

export function useCalculateMany(
  dataPoints: Array<{ value: number, date: ?Date }>,
  query: {
    from: Currency,
    to: Currency,
    disableRounding?: boolean,
    reverse?: boolean,
  }
): Array<?number> {
  const state = useCountervaluesState();
  // TODO how to approach perf for this? hash function of the datapoints? responsability on user land?
  return calculateMany(state, dataPoints, query);
}

// TODO perf of the useCalculate*, does it even worth worrying?
// TODO see what other suited hooks / helpers we need?
// TODO portfolio.js: should it be refined to be more perf? usePortfolio?
