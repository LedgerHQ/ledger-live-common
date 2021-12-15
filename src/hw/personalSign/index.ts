import ethereum from "./ethereum";
import { MessageData, Resolver, Result } from "./types";
import type { AppRequest, AppState } from "../actions/app";
import { from, Observable } from "rxjs";
import { withDevice } from "../deviceAccess";
import type { ConnectAppEvent, Input as ConnectAppInput } from "../connectApp";
import { Device } from "../actions/types";
import { createAction as createAppAction } from "../actions/app";
import { useCallback, useEffect, useRef, useState } from "react";
// TODO deprecate this approach
const all = {
  ethereum
};

const dispatch: Resolver = (transport, opts) => {
  const r = all[opts.currency.id];
  if (r) return r(transport, opts);
  throw new Error(`unsupported signTransaction(${opts.currency.id})`);
};

export default dispatch;


type BaseState = {
  signMessageRequested: MessageData | null | undefined;
  signMessageError: Error | null | undefined;
  signMessageResult: string | null | undefined;
};

export type State = AppState & BaseState;
export type Request = AppRequest & {
  message: MessageData;
};
export type Input = {
  request: Request;
  deviceId: string;
};
export const signMessageExec = ({
  request,
  deviceId,
}: Input): Observable<Result> => {
  const result: Observable<Result> = withDevice(deviceId)((t) =>
    from(dispatch(t, request.message))
  );
  return result;
};
const initialState: BaseState = {
  signMessageRequested: null,
  signMessageError: null,
  signMessageResult: null,
};
export const createAction = (
  connectAppExec: (arg0: ConnectAppInput) => Observable<ConnectAppEvent>,
  signMessage: (arg0: Input) => Observable<Result> = signMessageExec
) => {
  const useHook = (
    reduxDevice: Device | null | undefined,
    request: Request
  ): State => {
    const appState: AppState = createAppAction(connectAppExec).useHook(
      reduxDevice,
      {
        account: request.account,
      }
    );
    const { device, opened, inWrongDeviceForAccount, error } = appState;
    const [state, setState] = useState<BaseState>({
      ...initialState,
      signMessageRequested: request.message,
    });
    const signedFired = useRef<boolean>();
    const sign = useCallback(async () => {
      let result;

      if (!device) {
        setState({
          ...initialState,
          signMessageError: new Error("no Device"),
        });
        return;
      }

      try {
        result = await signMessage({
          request,
          deviceId: device.deviceId,
        }).toPromise();
      } catch (e: any) {
        if (e.name === "UserRefusedAddress") {
          e.name = "UserRefusedOnDevice";
          e.message = "UserRefusedOnDevice";
        }

        return setState({ ...initialState, signMessageError: e });
      }

      setState({ ...initialState, signMessageResult: result?.signature });
    }, [device, request]);
    useEffect(() => {
      if (!device || !opened || inWrongDeviceForAccount || error) {
        return;
      }

      if (state.signMessageRequested && !signedFired.current) {
        signedFired.current = true;
        sign();
      }
    }, [
      device,
      opened,
      inWrongDeviceForAccount,
      error,
      sign,
      state.signMessageRequested,
    ]);
    return { ...appState, ...state };
  };

  return {
    useHook,
    mapResult: (r: State) => ({
      signature: r.signMessageResult,
      error: r.signMessageError,
    }),
  };
};
