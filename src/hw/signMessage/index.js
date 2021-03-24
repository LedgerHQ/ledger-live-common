// @flow
import invariant from "invariant";
import {
  DeviceAppVerifyNotSupported,
  UserRefusedAddress,
} from "@ledgerhq/errors";
import { log } from "@ledgerhq/logs";
import { Observable } from "rxjs";
import type { Resolver } from "./types";
import perFamily from "../../generated/hw-signMessage";
import { useState, useEffect, useCallback } from "react";
import { from } from "rxjs";
import { createAction as createAppAction } from "../actions/app";
import type { AppRequest, AppState } from "../actions/app";
import type { Device } from "../actions/types";
import type { ConnectAppEvent, Input as ConnectAppInput } from "../connectApp";
import { withDevice } from "../deviceAccess";
import type { MessageData } from "./types";

const dispatch: Resolver = (transport, opts) => {
  const { currency, verify } = opts;
  const getAddress = perFamily[currency.family];
  invariant(getAddress, `signMessage is not implemented for ${currency.id}`);
  return getAddress(transport, opts)
    .then((result) => {
      log(
        "hw",
        `signMessage ${currency.id} on ${opts.path} with message [${opts.message}]`,
        result
      );
      return result;
    })
    .catch((e) => {
      log(
        "hw",
        `signMessage ${currency.id} on ${opts.path} FAILED ${String(e)}`
      );
      if (e && e.name === "TransportStatusError") {
        if (e.statusCode === 0x6b00 && verify) {
          throw new DeviceAppVerifyNotSupported();
        }
        if (e.statusCode === 0x6985 || e.statusCode === 0x5501) {
          throw new UserRefusedAddress();
        }
      }
      throw e;
    });
};

const initialState = {
  signMessageRequested: null,
  signMessageError: null,
  signMessageResult: null,
};

export type State = {
  ...AppState,
  signMessageRequested: ?MessageData,
  signMessageError: ?Error,
  signMessageResult: ?string,
};

export type Request = {
  ...AppRequest,
  message: MessageData,
};

export const createAction = (
  connectAppExec: (ConnectAppInput) => Observable<ConnectAppEvent>,
  signMessage: (ConnectAppInput) => Observable<T>
) => {
  const useHook = (reduxDevice: ?Device, request: Request): State => {
    const appState: AppState = createAppAction(connectAppExec).useHook(
      reduxDevice,
      {
        account: request.account,
      }
    );

    const { device, opened, inWrongDeviceForAccount, error } = appState;

    const [state, setState] = useState(initialState);

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
        result = await (
          signMessage ||
          withDevice(device.deviceId)((t) => from(dispatch(t, request.message)))
        ).toPromise();
      } catch (e) {
        if (e.name === "UserRefusedAddress") {
          e.name = "UserRefusedOnDevice";
          e.message = "UserRefusedOnDevice";
        }
        setState({
          ...initialState,
          signMessageError: e,
        });
      }
      setState({
        ...initialState,
        signMessageResult: result?.signature,
      });
    }, [request.message, device]);

    useEffect(() => {
      if (!device || !opened || inWrongDeviceForAccount || error) {
        setState(initialState);
        return;
      }

      setState({
        ...initialState,
        signMessageRequested: request.message,
      });

      sign();
    }, [device, opened, inWrongDeviceForAccount, error, request.message, sign]);

    return {
      ...appState,
      ...state,
    };
  };

  return {
    useHook,
    mapResult: (r: State) => ({
      signature: r.signMessageResult,
      error: r.signMessageError,
    }),
  };
};

export default dispatch;
