// @flow
import { Observable } from "rxjs";
import { useEffect, useState } from "react";
import type { ConnectAppEvent, Input as ConnectAppInput } from "../connectApp";
import type { Action, Device } from "./types";
import { toExchangeRaw } from "../../swap/serialization";
import type { AppState } from "./app";
import { scan, tap } from "rxjs/operators";
import { log } from "@ledgerhq/logs";
import { createAction as createAppAction } from "./app";
import type {
  Exchange,
  ExchangeRaw,
  ExchangeRate,
  InitSwapResult,
  SwapRequestEvent
} from "../../swap/types";

type State = {|
  initSwapResult: ?InitSwapResult,
  initSwapRequested: boolean,
  initSwapError: ?Error
|};

type InitSwapState = {|
  ...AppState,
  ...State
|};

type InitSwapRequest = {
  exchange: Exchange,
  exchangeRate: ExchangeRate
};

type Result =
  | {
      initSwapResult: InitSwapResult,
    }
  | {
      initSwapError: Error
    };

type InitSwapAction = Action<InitSwapRequest, InitSwapState, Result>;

const mapResult = ({ initSwapResult, initSwapError }: InitSwapState): ?Result =>
  initSwapResult
    ? { initSwapResult }
    : initSwapError
    ? { initSwapError }
    : null;

const initialState = {
  initSwapResult: null,
  initSwapError: null,
  initSwapRequested: false,
  isLoading: true
};

const reducer = (state: any, e: SwapRequestEvent) => {
  switch (e.type) {
    case "init-swap-error":
      return { ...state, initSwapError: e.error, isLoading: false };
    case "init-swap-requested":
      return { ...state, initSwapRequested: true, isLoading: false };
    case "init-swap-result":
      return {
        ...state,
        initSwapResult: e.initSwapResult,
        isLoading: false
      };
  }
  return state;
};

export const createAction = (
  connectAppExec: ConnectAppInput => Observable<ConnectAppEvent>,
  initSwapExec: ({
    exchange: ExchangeRaw,
    exchangeRate: ExchangeRate,
    deviceId: string
  }) => Observable<SwapRequestEvent>
): InitSwapAction => {
  const useHook = (
    reduxDevice: ?Device,
    initSwapRequest: InitSwapRequest
  ): InitSwapState => {
    const appState = createAppAction(connectAppExec).useHook(reduxDevice, {
      appName: "Bitcoin" // FIXME TODO until we have the silent mode swap app, we need to make it feel like it's bitcoin ¯\_(ツ)_/¯
    });

    const { device, opened } = appState;

    const [state, setState] = useState(initialState);

    useEffect(() => {
      if (!opened || !initSwapRequest || !device) {
        setState(initialState);
        return;
      }

      const { exchange, exchangeRate } = initSwapRequest;
      const sub = initSwapExec({
        exchange: toExchangeRaw(exchange),
        exchangeRate,
        deviceId: ""
      })
        .pipe(
          tap(e => {
            log("actions-initSwap-event", e.type, e);
            console.log("actions-initSwap-event", e.type, e);
          }),
          scan(reducer, initialState)
        )
        .subscribe(setState);

      return () => {
        console.log("exiting the useeffect code, and ruining everything");
        sub.unsubscribe();
      };
    }, [initSwapRequest, device, opened]);

    return {
      ...appState,
      ...state
    };
  };

  return {
    useHook,
    mapResult
  };
};
