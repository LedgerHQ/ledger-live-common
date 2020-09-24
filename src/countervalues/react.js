// @flow
import React, {
  createContext,
  useMemo,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  // ask for a re-poll of countervalues
  poll: () => Promise<boolean>,
  // force any potential scheduled polling to happen now
  flush: () => void,
  // true when the polling is in progress
  pending: boolean,
  // if the last polling failed, there will be an error
  error: ?Error,
};

export type Props = {
  initialCountervalues: ?CounterValuesState,
  updateCountervalues: (
    updater: (CounterValuesState) => CounterValuesState
  ) => void,
  children: React$Node,
  userSettings: CountervaluesSettings,
};

const CountervaluesPollingContext = createContext<Polling>({
  wipe: () => {},
  poll: () => Promise.resolve(false),
  flush: () => {},
  pending: false,
  error: null,
});

const CountervaluesContext = createContext<CounterValuesState>(initialState);

export const Countervalues = ({
  initialCountervalues,
  children,
  userSettings,
}: Props) => {
  // FIXME later switch to reducer?
  const [{ state, pending, error }, setState] = useState(() => ({
    pending: false,
    error: null,
    state: initialCountervalues || initialState,
  }));

  const updateNow = useCallback(() => {
    if (pending) return Promise.resolve(false);
    setState(({ state }) => ({ state, pending: true, error: null }));
    return loadCountervalues(state, userSettings).then(
      (state) => {
        setState({ state, pending: false, error: null });
        return true;
      },
      (error) => {
        setState(({ state }) => ({ state, pending: false, error }));
        return false;
      }
    );
  }, [pending, state, userSettings]);

  // TODO auto fetching mechanism
  // TODO throttling mechanism
  // QUICK HACK
  useEffect(() => {
    updateNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings]);

  const polling: Polling = useMemo(
    () => ({
      wipe: () => {
        setState({ pending: false, error: null, state: initialState });
      },
      poll: updateNow,
      flush: () => {},
      pending,
      error,
    }),
    [pending, error, updateNow]
  );

  return (
    <CountervaluesPollingContext.Provider value={polling}>
      <CountervaluesContext.Provider value={state}>
        {children}
      </CountervaluesContext.Provider>
    </CountervaluesPollingContext.Provider>
  );
};

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
