// @flow

import Transport from "@ledgerhq/hw-transport";
import { getDeviceModel } from "@ledgerhq/devices";
import { UnexpectedBootloader } from "@ledgerhq/errors";
import { of, concat, Observable, throwError } from "rxjs";
import { tap, map } from "rxjs/operators";
import type { Exec, AppOp, ListAppsEvent, ListAppsResult } from "./types";
import type { App, DeviceInfo, ApplicationVersion } from "../types/manager";
import { getProviderId } from "../manager";
import installApp from "../hw/installApp";
import uninstallApp from "../hw/uninstallApp";
import { log } from "@ledgerhq/logs";
import getDeviceInfo from "../hw/getDeviceInfo";
import type { ConnectAppEvent } from "../hw/connectApp";
import {
  listCryptoCurrencies,
  currenciesByMarketcap,
  findCryptoCurrencyById,
} from "../currencies";
import ManagerAPI from "../api/Manager";
import { OutdatedApp } from "../errors";
import { getEnv } from "../env";
import hwListApps from "../hw/listApps";
import { polyfillApp, polyfillApplication, getDependencies } from "./polyfill";

export const execWithTransport = (transport: Transport<*>): Exec => (
  appOp: AppOp,
  targetId: string | number,
  app: App
) => {
  const fn = appOp.type === "install" ? installApp : uninstallApp;
  return fn(transport, targetId, app);
};

const appsThatKeepChangingHashes = ["Fido U2F"];

const inlineInstall = (
  transport: Transport<*>,
  applicationByDevice: Array<ApplicationVersion>,
  targetId: string | number,
  appName: string,
  o
): Observable<*> => {
  const targetAppVersion = applicationByDevice.find(
    ({ name }) => name === appName
  );
  if (targetAppVersion) {
    // $FlowFixMe
    return installApp(transport, targetId, targetAppVersion).pipe(
      map((e) => {
        if (e.progress) {
          return {
            type: "installing-app",
            appName,
            progress: e.progress,
            targetAppVersion,
            e,
          };
        }
        return e;
      }),
      tap((e) => {
        o.next(e);
      })
    );
  } else {
    return of({
      type: "error",
      error: new Error(`Couldn't find a match for app ${appName}`),
    });
  }
};
export const standaloneAppOp = (
  transport: Transport<*>,
  appOp: AppOp
): Observable<ConnectAppEvent> =>
  Observable.create((o) => {
    let sub;

    async function main() {
      o.next({ type: "listing-apps" }); // Triggers the _checking dependencies_ UI
      const deviceInfo = await getDeviceInfo(transport);
      const provider = getProviderId(deviceInfo);
      const { targetId, version } = deviceInfo;
      const deviceVersion = await ManagerAPI.getDeviceVersion(
        targetId,
        provider
      );
      const firmwareData = await ManagerAPI.getCurrentFirmware({
        deviceId: deviceVersion.id,
        version,
        provider,
      });
      const applicationByDevice: Array<ApplicationVersion> = await ManagerAPI.applicationsByDevice(
        {
          provider,
          current_se_firmware_final_version: firmwareData.id,
          device_version: deviceVersion.id,
        }
      );

      const targetApp = applicationByDevice.find(
        ({ name }) => name === appOp.name
      );
      if (!targetApp) return; // This should never happen but

      const queue = [];
      // Does the target app have dependencies
      const dependencies = getDependencies(appOp.name);

      // Only listApps if so
      if (dependencies.length) {
        const listAppsP = new Promise((resolve, reject) => {
          sub = listApps(transport, deviceInfo).subscribe({
            next: (e) => {
              if (e.type === "result") {
                resolve(e.result);
              } else if (
                e.type === "device-permission-granted" ||
                e.type === "device-permission-requested"
              ) {
                o.next(e);
              }
            },
            error: reject,
          });
        });

        // Basic coverage of dependencies where we only try to install if it's
        // not present, outdated apps will prompt user to go to the manager.
        const listAppsResult = await listAppsP;
        if (listAppsResult && listAppsResult?.installed) {
          for (let i = 0; i < dependencies.length; i++) {
            const match = listAppsResult.installed.find(
              (app) => app.name === dependencies[i]
            );

            if (!match) {
              queue.push(
                // TODO implement inline uninstall (?)
                inlineInstall(
                  transport,
                  applicationByDevice,
                  targetId,
                  dependencies[i],
                  o
                )
              );
            } else if (match.version !== targetApp.version) {
              o.error(new OutdatedApp(null, { appName: match.name }));
              return;
            }
          }
        }
      }

      queue.push(
        inlineInstall(transport, applicationByDevice, targetId, appOp.name, o)
      );

      await concat(...queue).toPromise();
    }

    main().then(
      () => {
        o.complete();
      },
      (e) => {
        o.error(e);
      }
    );

    return () => {
      if (sub) sub.unsubscribe();
    };
  });

export const listApps = (
  transport: Transport<*>,
  deviceInfo: DeviceInfo
): Observable<ListAppsEvent> => {
  if (deviceInfo.isOSU || deviceInfo.isBootloader) {
    return throwError(new UnexpectedBootloader(""));
  }

  const deviceModelId =
    // $FlowFixMe
    (transport.deviceModel && transport.deviceModel.id) || "nanoS";

  return Observable.create((o) => {
    let sub;

    async function main() {
      const installedP = new Promise((resolve, reject) => {
        sub = ManagerAPI.listInstalledApps(transport, {
          targetId: deviceInfo.targetId,
          perso: "perso_11",
        }).subscribe({
          next: (e) => {
            if (e.type === "result") {
              resolve(e.payload);
            } else if (
              e.type === "device-permission-granted" ||
              e.type === "device-permission-requested"
            ) {
              o.next(e);
            }
          },
          error: reject,
        });
      })
        .then((apps) =>
          apps.map(({ name, hash }) => ({ name, hash, blocks: 0 }))
        )
        .catch((e) => {
          log("hw", "failed to HSM list apps " + String(e) + "\n" + e.stack);
          if (getEnv("EXPERIMENTAL_FALLBACK_APDU_LISTAPPS")) {
            return hwListApps(transport)
              .then((apps) =>
                apps.map(({ name, hash, blocks }) => ({
                  name,
                  hash,
                  blocks,
                }))
              )
              .catch((e) => {
                log(
                  "hw",
                  "failed to device list apps " + String(e) + "\n" + e.stack
                );
                throw e;
              });
          } else {
            throw e;
          }
        })
        .then((apps) => [apps, true]);

      const provider = getProviderId(deviceInfo);

      const deviceVersionP = ManagerAPI.getDeviceVersion(
        deviceInfo.targetId,
        provider
      );

      const firmwareDataP = deviceVersionP.then((deviceVersion) =>
        ManagerAPI.getCurrentFirmware({
          deviceId: deviceVersion.id,
          version: deviceInfo.version,
          provider,
        })
      );

      const applicationsByDeviceP = Promise.all([
        deviceVersionP,
        firmwareDataP,
      ]).then(([deviceVersion, firmwareData]) =>
        ManagerAPI.applicationsByDevice({
          provider,
          current_se_firmware_final_version: firmwareData.id,
          device_version: deviceVersion.id,
        })
      );

      const [
        [partialInstalledList, installedAvailable],
        applicationsList,
        compatibleAppVersionsList,
        firmware,
        sortedCryptoCurrencies,
      ] = await Promise.all([
        installedP,
        ManagerAPI.listApps().then((apps) => apps.map(polyfillApplication)),
        applicationsByDeviceP,
        firmwareDataP,
        currenciesByMarketcap(
          listCryptoCurrencies(getEnv("MANAGER_DEV_MODE"), true)
        ),
      ]);

      // unfortunately we sometimes (nano s 1.3.1) miss app.name (it's set as "" from list apps)
      // the fallback strategy is to look it up in applications list
      // for performance we might eventually only load applications in case one name is missing
      let installedList = partialInstalledList;
      const shouldCompleteInstalledList = partialInstalledList.some(
        (a) => !a.name
      );
      if (shouldCompleteInstalledList) {
        installedList = installedList.map((a) => {
          if (a.name) return a; // already present
          const application = applicationsList.find((e) =>
            e.application_versions.some((v) => v.hash === a.hash)
          );
          if (!application) return a; // still no luck with our api
          return { ...a, name: application.name };
        });
      }

      const apps = compatibleAppVersionsList
        .map((version) => {
          const application = applicationsList.find(
            (e) => e.id === version.app
          );
          if (!application) return;
          const isDevTools = application.category === 2;

          let currencyId = application.currencyId;
          const crypto = currencyId && findCryptoCurrencyById(currencyId);
          if (!crypto) {
            currencyId = undefined;
          }
          const indexOfMarketCap = crypto
            ? sortedCryptoCurrencies.indexOf(crypto)
            : -1;

          const compatibleWallets = [];
          if (application.compatibleWalletsJSON) {
            try {
              const parsed = JSON.parse(application.compatibleWalletsJSON);
              if (parsed && Array.isArray(parsed)) {
                parsed.forEach((w) => {
                  if (w && typeof w === "object" && w.name) {
                    compatibleWallets.push({
                      name: w.name,
                      url: w.url,
                    });
                  }
                });
              }
            } catch (e) {
              console.error(
                "invalid compatibleWalletsJSON for " + version.name,
                e
              );
            }
          }

          const app: $Exact<App> = polyfillApp({
            id: version.id,
            name: version.name,
            version: version.version,
            currencyId,
            description: version.description,
            dateModified: version.date_last_modified,
            icon: version.icon,
            authorName: application.authorName,
            supportURL: application.supportURL,
            contactURL: application.contactURL,
            sourceURL: application.sourceURL,
            compatibleWallets,
            hash: version.hash,
            perso: version.perso,
            firmware: version.firmware,
            firmware_key: version.firmware_key,
            delete: version.delete,
            delete_key: version.delete_key,
            dependencies: [],
            bytes: version.bytes,
            warning: version.warning,
            indexOfMarketCap,
            isDevTools,
          });

          return app;
        })
        .filter(Boolean);

      log(
        "list-apps",
        `${installedList.length} apps installed. ${applicationsList.length} apps store total. ${apps.length} available.`,
        { installedList }
      );

      const deviceModel = getDeviceModel(deviceModelId);

      const appByName = {};
      apps.forEach((app) => {
        appByName[app.name] = app;
      });

      // Infer more data on the app installed
      const installed = installedList.map(({ name, hash, blocks }) => {
        const app = applicationsList.find((a) => a.name === name);
        const installedAppVersion =
          app && hash
            ? app.application_versions.find((v) => v.hash === hash)
            : null;
        const availableAppVersion = appByName[name];
        const blocksSize =
          blocks ||
          Math.ceil(
            ((installedAppVersion || availableAppVersion || { bytes: 0 })
              .bytes || 0) / deviceModel.getBlockSize(deviceInfo.version)
          );
        const updated =
          appsThatKeepChangingHashes.includes(name) ||
          (availableAppVersion ? availableAppVersion.hash === hash : false);
        const version = installedAppVersion ? installedAppVersion.version : "";
        const availableVersion = availableAppVersion
          ? availableAppVersion.version
          : "";
        return {
          name,
          updated,
          blocks: blocksSize,
          hash,
          version,
          availableVersion,
        };
      });

      const appsListNames = (getEnv("MANAGER_DEV_MODE")
        ? apps
        : apps.filter(
            (a) =>
              !a.isDevTools || installed.some(({ name }) => name === a.name)
          )
      ).map((a) => a.name);

      const result: ListAppsResult = {
        appByName,
        appsListNames,
        installed,
        installedAvailable,
        deviceInfo,
        deviceModelId,
        firmware,
      };

      o.next({
        type: "result",
        result,
      });
    }

    main().then(
      () => {
        o.complete();
      },
      (e) => {
        o.error(e);
      }
    );

    return () => {
      if (sub) sub.unsubscribe();
    };
  });
};
