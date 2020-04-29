// @flow
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import type { Currency } from "../types";
import {
  initialState,
  calculate,
  calculateMany,
  loadCountervalues,
} from "./logic";
import type { CounterValuesState, CountervaluesSettings } from "./types";

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

export const BridgeSync = ({
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
  const context = useContext(CountervaluesPollingContext);
  return context;
}

export function useCountervaluesState(): CounterValuesState {
  const context = useContext(CountervaluesContext);
  return context;
}

export function useCalculate(query: {
  value: number,
  from: Currency,
  to: Currency,
  disableRounding?: boolean,
  date?: ?Date,
}): ?number {
  const state = useCountervaluesState();
  return calculate(state, query);
}

export function useCalculateMany(
  dataPoints: Array<{ value: number, date: ?Date }>,
  query: { from: Currency, to: Currency }
): Array<?number> {
  const state = useCountervaluesState();
  return calculateMany(state, dataPoints, query);
}

// QUESTION should we use BigNumber? assess the precision. i think we do not need in context of counter values.

// TODO see what other suited hooks / helpers we need?
// TODO portfolio.js: should it be refined to be more perf? usePortfolio?
