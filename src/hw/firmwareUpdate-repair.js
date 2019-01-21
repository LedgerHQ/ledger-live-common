// @flow
import { Observable, from, of, empty, concat } from "rxjs";
import {
  concatMap,
  delay,
  filter,
  map,
  throttleTime,
} from "rxjs/operators";

import { CantOpenDevice } from "@ledgerhq/errors";
import ManagerAPI from "../api/Manager";
import { withDevicePolling } from "../hw/deviceAccess";
import getDeviceInfo from "../hw/getDeviceInfo";

const wait2s = of({ type: "wait" }).pipe(delay(2000));

export const forceRepairChoices = [
  { value: undefined, label: "generic" },
  { value: "0.7", label: "mcuNotGenuine" },
  { value: "0.9", label: "followDeviceRepair" }
];

const repair = (
  deviceId: string,
  forceMCU: ?string
): Observable<{ progress: number }> => {
  const withDeviceInfo = withDevicePolling(deviceId)(
    transport => from(getDeviceInfo(transport)),
    () => true // accept all errors. we're waiting forever condition that make getDeviceInfo work
  );

  const waitForBootloader = withDeviceInfo.pipe(
    concatMap(
      deviceInfo =>
        deviceInfo.isBootloader ? empty() : concat(wait2s, waitForBootloader)
    )
  );

  const loop = (forceMCU: ?string) =>
    withDevicePolling(deviceId)(
      transport =>
        from(getDeviceInfo(transport)).pipe(
          concatMap(deviceInfo => {
            const installMcu = (version: string) =>
              ManagerAPI.installMcu(transport, "mcu", {
                targetId: deviceInfo.targetId,
                version
              });

            if (!deviceInfo.isBootloader) {
              // finish earlier
              return empty();
            }

            if (forceMCU) {
              return concat(installMcu(forceMCU), wait2s, loop());
            }

            switch (deviceInfo.rawVersion) {
              case "0.0":
                return concat(installMcu("0.6"), wait2s, loop());

              case "0.6":
                return installMcu("1.5");

              case "0.7":
                return installMcu("1.6");

              case "0.9":
                return installMcu("1.7");

              default:
                return empty();
            }
          })
        ),
      e => e instanceof CantOpenDevice // this can happen if withDevicePolling was still seeing the device but it was then interrupted by a device reboot
    );

  // TODO ideally we should race waitForBootloader with an event "display-bootloader-reboot", it should be a delayed event that is not emitted if waitForBootloader is fast enough..
  return concat(waitForBootloader, loop(forceMCU)).pipe(
    filter(e => e.type === "bulk-progress"),
    map(e => ({ progress: e.progress })),
    throttleTime(100)
  );
};

export default repair;
