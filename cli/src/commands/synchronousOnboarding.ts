import { from, interval, Observable } from "rxjs";
import { withDevice } from "@ledgerhq/live-common/lib/hw/deviceAccess";
import getDeviceInfo from "@ledgerhq/live-common/lib/hw/getDeviceInfo";
import { deviceOpt } from "../scan";
import { concatMap, finalize, take } from "rxjs/operators";
export default {
  job: ({
    device,
  }: Partial<{
    device: string;
  }>) => interval(1000).pipe(
      concatMap(() => withDevice(device || "")((t) => from(getDeviceInfo(t)))),
    )
};