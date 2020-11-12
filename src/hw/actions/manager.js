// @flow
import {
  concat,
  of,
  empty,
  interval,
  Observable,
  TimeoutError,
  throwError,
} from "rxjs";
import {
  scan,
  debounce,
  debounceTime,
  catchError,
  switchMap,
  tap,
  distinctUntilChanged,
  timeout,
} from "rxjs/operators";
import { useEffect, useCallback, useState } from "react";
import { log } from "@ledgerhq/logs";
import type { DeviceInfo } from "../../types/manager";
import type { ListAppsResult } from "../../apps/types";
import { useReplaySubject } from "../../observable";
import manager from "../../manager";
import type {
  ConnectManagerEvent,
  Input as ConnectManagerInput,
} from "../connectManager";
import type { Action, Device } from "./types";
import isEqual from "lodash/isEqual";
import { ConnectManagerTimeout } from "../../errors";
import { currentMode } from "./app";
import {
  DisconnectedDevice,
  DisconnectedDeviceDuringOperation,
} from "@ledgerhq/errors";
import { getDeviceModel } from "@ledgerhq/devices";

type State = {|
  isLoading: boolean,
  requestQuitApp: boolean,
  unresponsive: boolean,
  allowManagerRequestedWording: ?string,
  allowManagerGranted: boolean,
  device: ?Device,
  deviceInfo: ?DeviceInfo,
  result: ?ListAppsResult,
  error: ?Error,
|};

type ManagerState = {|
  ...State,
  repairModalOpened: ?{ auto: boolean },
  onRetry: () => void,
  onAutoRepair: () => void,
  onRepairModal: (boolean) => void,
  closeRepairModal: () => void,
|};

type Result = {|
  device: Device,
  deviceInfo: DeviceInfo,
  result: ?ListAppsResult,
|};

type ManagerAction = Action<void, ManagerState, Result>;

type Event =
  | ConnectManagerEvent
  | { type: "error", error: Error }
  | { type: "deviceChange", device: ?Device };

const mapResult = ({ deviceInfo, device, result }): ?Result =>
  deviceInfo && device
    ? {
        device,
        deviceInfo,
        result,
      }
    : null;

const getInitialState = (device?: ?Device): State => ({
  isLoading: !!device,
  requestQuitApp: false,
  unresponsive: false,
  allowManagerRequestedWording: null,
  allowManagerGranted: false,
  device,
  deviceInfo: null,
  result: null,
  error: null,
});

const reducer = (state: State, e: Event): State => {
  switch (e.type) {
    case "unresponsiveDevice":
      return {
        ...state,
        unresponsive: true,
      };

    case "deviceChange":
      return getInitialState(e.device);

    case "error":
      return {
        ...getInitialState(state.device),
        error: e.error,
        isLoading: false,
      };

    case "appDetected":
      return {
        ...state,
        unresponsive: false,
        requestQuitApp: true,
      };

    case "osu":
    case "bootloader":
      return {
        ...state,
        isLoading: false,
        unresponsive: false,
        requestQuitApp: false,
        deviceInfo: e.deviceInfo,
      };

    case "listingApps":
      return {
        ...state,
        requestQuitApp: false,
        unresponsive: false,
        deviceInfo: e.deviceInfo,
      };

    case "device-permission-requested":
      return {
        ...state,
        unresponsive: false,
        allowManagerRequestedWording: e.wording,
      };

    case "device-permission-granted":
      return {
        ...state,
        unresponsive: false,
        allowManagerRequestedWording: null,
        allowManagerGranted: true,
      };

    case "result":
      return {
        ...state,
        isLoading: false,
        unresponsive: false,
        result: e.result,
      };
  }
  return state;
};

const implementations = {
  // in this paradigm, we know that deviceSubject is reflecting the device events
  // so we just trust deviceSubject to reflect the device context (switch between apps, dashboard,...)
  event: ({ deviceSubject, connectManager }) =>
    deviceSubject.pipe(debounceTime(1000), switchMap(connectManager)),

  // in this paradigm, we can't observe directly the device, so we have to poll it
  polling: ({ deviceSubject, connectManager }) =>
    Observable.create((o) => {
      const POLLING = 2000;
      const INIT_DEBOUNCE = 5000;
      const DISCONNECT_DEBOUNCE = 5000;
      const DEVICE_POLLING_TIMEOUT = 20000;

      // this pattern allows to actually support events based (like if deviceSubject emits new device changes) but inside polling paradigm
      let pollingOnDevice;
      const sub = deviceSubject.subscribe((d) => {
        if (d) {
          pollingOnDevice = d;
        }
      });
      let initT = setTimeout(() => {
        // initial timeout to unset the device if it's still not connected
        o.next({ type: "deviceChange", device: null });
        device = null;
        log("app/polling", "device init timeout");
      }, INIT_DEBOUNCE);

      let connectSub;
      let loopT;
      let disconnectT;
      let device = null; // used as internal state for polling
      let stopDevicePollingError = null;

      function loop() {
        stopDevicePollingError = null;
        if (!pollingOnDevice) {
          loopT = setTimeout(loop, POLLING);
          return;
        }
        log("manager/polling", "polling loop");
        connectSub = connectManager(pollingOnDevice)
          .pipe(
            timeout(DEVICE_POLLING_TIMEOUT),
            catchError((err) => {
              const productName = getDeviceModel(pollingOnDevice.modelId)
                .productName;

              return err instanceof TimeoutError
                ? of({
                    type: "error",
                    error: (new ConnectManagerTimeout(null, {
                      productName,
                    }): Error),
                  })
                : throwError(err);
            })
          )
          .subscribe({
            next: (event) => {
              if (initT && device) {
                clearTimeout(initT);
                initT = null;
              }
              if (disconnectT) {
                // any connect app event unschedule the disconnect debounced event
                clearTimeout(disconnectT);
                disconnectT = null;
              }
              if (event.type === "error" && event.error) {
                if (
                  event.error instanceof DisconnectedDevice ||
                  event.error instanceof DisconnectedDeviceDuringOperation
                ) {
                  // disconnect on manager actions seems to trigger a type "error" instead of "disconnect"
                  // the disconnect event is delayed to debounce the reconnection that happens when switching apps
                  disconnectT = setTimeout(() => {
                    disconnectT = null;
                    // a disconnect will locally be remembered via locally setting device to null...
                    device = null;
                    o.next(event);
                    log("app/polling", "device disconnect timeout");
                  }, DISCONNECT_DEBOUNCE);
                } else {
                  // These error events should stop polling
                  stopDevicePollingError = event.error;
                  // clear all potential polling loops
                  if (loopT) {
                    clearTimeout(loopT);
                    loopT = null;
                  }
                  // send in the event for the UI immediately
                  o.next(event);
                }
              } else if (event.type === "unresponsiveDevice") {
                return; // ignore unresponsive case which happens for polling
              } else {
                if (device !== pollingOnDevice) {
                  // ...but any time an event comes back, it means our device was responding and need to be set back on in polling context
                  device = pollingOnDevice;
                  o.next({ type: "deviceChange", device });
                }
                o.next(event);
              }
            },
            complete: () => {
              // start a new polling if available
              if (!stopDevicePollingError) loopT = setTimeout(loop, POLLING);
            },
            error: (e) => {
              o.error(e);
            },
          });
      }

      // delay a bit the first loop run in order to be async and wait pollingOnDevice
      loopT = setTimeout(loop, 0);

      return () => {
        if (initT) clearTimeout(initT);
        if (disconnectT) clearTimeout(disconnectT);
        if (connectSub) connectSub.unsubscribe();
        sub.unsubscribe();
        clearTimeout(loopT);
      };
    }).pipe(distinctUntilChanged(isEqual)),
};

export const createAction = (
  connectManagerExec: (ConnectManagerInput) => Observable<ConnectManagerEvent>
): ManagerAction => {
  const connectManager = (device) =>
    concat(
      of({ type: "deviceChange", device }),
      !device
        ? empty()
        : connectManagerExec({ devicePath: device.deviceId }).pipe(
            catchError((error: Error) => of({ type: "error", error }))
          )
    );

  const useHook = (device: ?Device): ManagerState => {
    // repair modal will interrupt everything and be rendered instead of the background content
    const [repairModalOpened, setRepairModalOpened] = useState(null);
    const [state, setState] = useState(() => getInitialState(device));
    const [resetIndex, setResetIndex] = useState(0);
    const deviceSubject = useReplaySubject(device);

    useEffect(() => {
      const impl = implementations[currentMode]({
        deviceSubject,
        connectManager,
      });

      if (repairModalOpened) return;

      const sub = impl
        .pipe(
          // debounce a bit the connect/disconnect event that we don't need
          tap((e) => log("actions-manager-event", e.type, e)),
          // tap(e => console.log("connectManager event", e)),
          // we gather all events with a reducer into the UI state
          scan(reducer, getInitialState()),
          // tap(s => console.log("connectManager state", s)),
          // we debounce the UI state to not blink on the UI
          debounce((s) => {
            if (s.allowManagerRequestedWording || s.allowManagerGranted) {
              // no debounce for allow manager
              return empty();
            }
            // default debounce (to be tweak)
            return interval(1500);
          })
        )
        // the state simply goes into a React state
        .subscribe(setState);

      return () => {
        sub.unsubscribe();
      };
    }, [deviceSubject, resetIndex, repairModalOpened]);

    const { deviceInfo } = state;
    useEffect(() => {
      if (!deviceInfo) return;
      // Preload latest firmware in parallel
      manager.getLatestFirmwareForDevice(deviceInfo).catch((e: Error) => {
        log("warn", e.message);
      });
    }, [deviceInfo]);

    const onRepairModal = useCallback((open) => {
      setRepairModalOpened(open ? { auto: false } : null);
    }, []);

    const closeRepairModal = useCallback(() => {
      setRepairModalOpened(null);
    }, []);

    const onRetry = useCallback(() => {
      setResetIndex((currIndex) => currIndex + 1);
      setState((s) => getInitialState(s.device));
    }, []);

    const onAutoRepair = useCallback(() => {
      setRepairModalOpened({ auto: true });
    }, []);

    return {
      ...state,
      repairModalOpened,
      onRetry,
      onAutoRepair,
      closeRepairModal,
      onRepairModal,
    };
  };

  return {
    useHook,
    mapResult,
  };
};
