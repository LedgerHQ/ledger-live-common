// @flow
import { of, Observable } from "rxjs";
import { useEffect, useState } from "react";
import type { ConnectAppEvent, Input as ConnectAppInput } from "../connectApp";
import type { Action, Device } from "./types";
import { toExchangeRaw } from "../../swap/serialization";
import type { AppState } from "./app";
import { scan, catchError, tap } from "rxjs/operators";
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
      device: Device
    }
  | {
      initSwapError: Error
    };

type InitSwapAction = Action<InitSwapRequest, InitSwapState, Result>;

const mapResult = ({
  device,
  initSwapResult,
  initSwapError
}: InitSwapState): ?Result =>
  initSwapResult && device
    ? { initSwapResult, device }
    : initSwapError
    ? { initSwapError }
    : null;

const initialState = {
  initSwapResult: null,
  initSwapError: null,
  initSwapRequested: false,
  isLoading: true
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
      appName: "Exchange"
    });

    const { device, opened, error } = appState;

    const [state, setState] = useState(initialState);

    useEffect(() => {
      if (!device || !opened || error || !initSwapRequest) {
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
          catchError(error => of({ type: "error", error })),
          tap(e => log("actions-initSwap-event", e.type, e)),
          scan((state: any, e: SwapRequestEvent) => {
            switch (e.type) {
              case "error":
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
          }, initialState)
        )
        .subscribe(setState);

      return () => {
        sub.unsubscribe();
      };
    }, [state, initSwapRequest, device, error, opened, setState]);

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
