import { Observable, of, from } from "rxjs";
import { throttleTime, filter, map, catchError, mergeMap } from "rxjs/operators";
import { ManagerAppDepInstallRequired } from "@ledgerhq/errors";
import Transport from "@ledgerhq/hw-transport";
import type { ApplicationVersion, App } from "../types/manager";
import ManagerAPI from "../api/Manager";
import { getDependencies } from "../apps/polyfill";
import { withDevice } from "./deviceAccess";
import getDeviceInfo from "./getDeviceInfo";

export default function installLanguage(
  deviceId: string,
  language: Language
): Observable<{
  progress: number;
}> {
  const sub = withDevice(deviceId)((transport) => {
    const obs = from(getDeviceInfo(transport)).pipe(
      mergeMap(async (deviceInfo) => {
        
      })
    );
    return of({}); // todo return real observable
  });


  return of({ progress: 1 }); // todo return real observable
}
