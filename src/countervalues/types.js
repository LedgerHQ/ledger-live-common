// @flow
import type { Currency } from "../types/currencies";

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
  error: ?Error
};

export type PairOptExchange = {
  from: Currency,
  to: Currency,
  exchange: ?string
};

export type PairsSelector<State> = (state: State) => PairOptExchange[];

export type Histodays = {
  latest: number,
  [day: string]: number
};

export type RatesMap = {
  [to: string]: {
    [from: string]: {
      [exchange: string]: Histodays
    }
  }
};

export type CounterValuesState = {
  rates: RatesMap
};

export type Input<State> = {
  // example: () => "http://localhost:8088"
  getAPIBaseURL: () => string,

  storeSelector: (state: State) => CounterValuesState,
  // yield a list of pairs & exchange to pull from, based on the store state
  // when you user have never set a preferred exchange, you can not provide the exchange,
  // however it should be provided the next time if you implement setPairUnsetExchanges properly
  pairsSelector: PairsSelector<State>,
  // in case pairsSelector was containing pairs without exchanges specified, this action will be called
  // the action must change your settings state in order for the next call to `pairsSelector` to have exchanges resolved.
  setExchangePairsAction: (
    Array<{
      from: Currency,
      to: Currency,
      exchange: string
    }>
  ) => Object,

  // The maximum number of days of interest to go back in time for countervalues.
  // if not provided, it will try to pull all history. if provided, it helps bandwidth performance
  // but you won't have any countervalue if you calculate older than this.
  maximumDays?: number,

  // takes a function called at mount of CounterValuePollingProvider
  // that provides schedulePoll / cancelPoll that is a way to hook
  // polling to whatever platform related things
  // for instance, on mobile we schedule poll:
  // - when app comes back from dashboard,
  // - when mobile app gets network again,
  // NB the poll at init & auto poll each MS time is already included and you don't need to handle it.
  // the function you must return will be called when CounterValuePollingProvider unmount
  // probably it might never unmounted (if it's your root) but it's good practice to implement
  addExtraPollingHooks?: (
    schedulePoll: (ms: number) => void,
    cancelPoll: () => void
  ) => () => void
};

export type Exchange = {
  id: string,
  name: string,
  website: ?string
};

type PollingProviderProps = {
  children: React$Element<*>,
  pollThrottle?: number,
  pollInitDelay?: number,
  autopollInterval?: number
};

export type Module<State> = {
  calculateSelector: (
    state: State,
    { value: number, from: Currency, to: Currency, exchange: string }
  ) => number,

  reverseSelector: (
    state: State,
    { value: number, from: Currency, to: Currency, exchange: string }
  ) => number,

  reducer: (store: CounterValuesState, action: Object) => CounterValuesState,

  // Create a context that provide a polling mechanism for React
  PollingProvider: React$ComponentType<PollingProviderProps>,

  PollingConsumer: React$ComponentType<{
    children: Polling => React$Element<*>
  }>,

  // Complementary APIs, independently of the store
  fetchExchangesForPair: (from: Currency, to: Currency) => Promise<Exchange[]>
};
