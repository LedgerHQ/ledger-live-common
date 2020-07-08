// @flow

import { Observable, concat, from, of, throwError, defer } from "rxjs";
import { concatMap, catchError, delay } from "rxjs/operators";
import type { DeviceInfo } from "../types/manager";
import type { ListAppsEvent } from "../apps";
import { listApps } from "../apps/hw";
import { withDevice } from "./deviceAccess";
import getDeviceInfo from "./getDeviceInfo";
import getAppAndVersion from "./getAppAndVersion";
import { dashboardNames } from "./connectApp";
export type Input = {
  devicePath: string,
};

export type ConnectManagerEvent =
  | { type: "appDetected" }
  | { type: "unresponsiveDevice" }
  | { type: "osu", deviceInfo: DeviceInfo }
  | { type: "bootloader", deviceInfo: DeviceInfo }
  | { type: "listingApps", deviceInfo: DeviceInfo }
  | ListAppsEvent;

const cmd = ({ devicePath }: Input): Observable<ConnectManagerEvent> =>
  withDevice(devicePath)((transport) =>
    Observable.create((o) => {
      const timeoutSub = of({ type: "unresponsiveDevice" })
        .pipe(delay(1000))
        .subscribe((e) => o.next(e));

      const sub = defer(() => from(getAppAndVersion(transport)))
        .pipe(
          concatMap((appAndVersion) => {
            timeoutSub.unsubscribe();

            if (dashboardNames.includes(appAndVersion.name)) {
              // we're in dashboard
              return from(getDeviceInfo(transport)).pipe(
                concatMap((deviceInfo) => {
                  timeoutSub.unsubscribe();

                  if (deviceInfo.isBootloader) {
                    return of({ type: "bootloader", deviceInfo });
                  }

                  if (deviceInfo.isOSU) {
                    return of({ type: "osu", deviceInfo });
                  }

                  return concat(
                    of({ type: "listingApps", deviceInfo }),
                    listApps(transport, deviceInfo)
                  );
                })
              );
            }

            return of({ type: "appDetected" });
          }),
          catchError((e) => {
            // Handle specific responses?
            return throwError(e);
          })
        )
        .subscribe(o);

      return () => {
        timeoutSub.unsubscribe();
        sub.unsubscribe();
      };
    })
  );

export default cmd;
