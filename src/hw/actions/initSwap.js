// @flow
import { Observable } from "rxjs";
import { useEffect, useState } from "react";
import type { ConnectAppEvent, Input as ConnectAppInput } from "../connectApp";
import type { Action, Device } from "./types";
import type { AppState } from "./app";
import { createAction as createAppAction } from "./app";
import type {
  Exchange,
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
  initSwapRequested: false
};

export const createAction = (
  connectAppExec: ConnectAppInput => Observable<ConnectAppEvent>,
  initSwapExec: ({
    exchange: Exchange,
    exchangeRate: ExchangeRate,
    deviceId: string
  }) => Observable<SwapRequestEvent>
): InitSwapAction => {
  const useHook = (
    reduxDevice: ?Device,
    initSwapRequest: InitSwapRequest
  ): InitSwapState => {
    const { exchange, exchangeRate } = initSwapRequest;

    const appState = createAppAction(connectAppExec).useHook(reduxDevice, {
      appName: "Exchange"
    });

    const { device, opened, error } = appState;

    const [state, setState] = useState(initialState);

    useEffect(() => {
      if (!device || !opened || error) {
        setState(initialState);
        return;
      }

      const sub = initSwapExec({
        exchange,
        exchangeRate,
        deviceId: device.deviceId
      }).subscribe(
        next => {
          console.log({ next });
        },
        error => {
          console.log({ error });
        }
      );

      return () => {
        sub.unsubscribe();
      };
    }, [exchange, exchangeRate, device, error, opened, setState]);

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
