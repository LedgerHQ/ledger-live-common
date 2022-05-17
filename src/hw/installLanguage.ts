import { Observable, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { TransportError } from "@ledgerhq/errors";

import ManagerAPI from "../api/Manager";
import { withDevice } from "./deviceAccess";
import getDeviceInfo from "./getDeviceInfo";
import { Language, languageIds, LanguagePackage } from "../types/languages";
import { getProviderId } from "../manager/provider";
import network from "../network";
import { LanguageInstallRefusedOnDevice } from "../errors";

type InstallLanguageEvent =
  | {
      type: "progress";
      progress: number;
    }
  | {
      type: "devicePermissionRequested";
    };

export default function installLanguage(deviceId: string, language: Language): Observable<InstallLanguageEvent> {
  const sub = withDevice(deviceId)(
    (transport) =>
      new Observable<InstallLanguageEvent>((subscriber) => {
        from(getDeviceInfo(transport))
          .pipe(
            mergeMap(async (deviceInfo) => {
              const deviceVersion = await ManagerAPI.getDeviceVersion(deviceInfo.targetId, getProviderId(deviceInfo));

              const seFirmwareVersion = await ManagerAPI.getCurrentFirmware({
                version: deviceInfo.version,
                deviceId: deviceVersion.id,
                provider: getProviderId(deviceInfo),
              });

              const languages = await ManagerAPI.getLanguagePackages(deviceVersion.id, seFirmwareVersion.id);

              const packs: LanguagePackage[] = languages.filter((l: any) => l.language === language);

              if (!packs.length) return subscriber.error(new Error(`No language ${language} found`));
              const pack = packs[1];

              const { apdu_install_url } = pack;
              const url = apdu_install_url;

              const { data: rawApdus } = await network({
                method: "GET",
                url,
              });

              const apdus = rawApdus.split(/\r?\n/).filter(Boolean);

              // Gab comment: this will be done with a single apdu in the future IIRC
              for (const id of Object.values(languageIds)) {
                // do we want to reflect this on the UI? do we need to emit events here
                // what about error handling, maybe unhandled promise rejection might happen
                // at least try catch
                await transport.send(
                  0xe0,
                  0x33,
                  id,
                  0x00,
                  undefined,
                  [0x9000, 0x5501] // Expected responses when uninstalling.
                );
              }

              for (let i = 0; i < apdus.length; i++) {
                if (apdus[i].startsWith("e030")) {
                  subscriber.next({
                    type: "devicePermissionRequested",
                  });
                }

                const response = await transport.exchange(Buffer.from(apdus[i], "hex"));
                const status = response.readUInt16BE(response.length - 2);
                const statusStr = status.toString(16);

                // Some error handling
                if (status === 0x5501) {
                  return subscriber.error(new LanguageInstallRefusedOnDevice(statusStr));
                } else if (status !== 0x9000) {
                  return subscriber.error(new TransportError("Unexpected device response", statusStr));
                }

                subscriber.next({
                  type: "progress",
                  progress: (i + 1) / apdus.length,
                });
              }

              subscriber.complete();
            })
          )
          .subscribe();
      })
  );

  return sub;
}
