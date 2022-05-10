/* eslint-disable no-console */
import { from } from "rxjs";
import { gte } from "semver";
import type { ScanCommonOpts } from "../scan";
import { withDevice } from "@ledgerhq/live-common/lib/hw/deviceAccess";
import { createCustomErrorClass, TransportError } from "@ledgerhq/errors";
import { mergeMap } from "rxjs/operators";
import type { DeviceInfo } from "@ledgerhq/live-common/lib/types/manager";
import getDeviceInfo from "@ledgerhq/live-common/lib/hw/getDeviceInfo";
import ManagerAPI from "@ledgerhq/live-common/lib/api/Manager";
import { getProviderId } from "@ledgerhq/live-common/lib/manager/provider";
import network from "@ledgerhq/live-common/lib/network";
import { deviceOpt } from "../scan";

// archi doc: https://ledgerhq.atlassian.net/wiki/spaces/TA/pages/3560375295

type i18nJobOps = ScanCommonOpts & {
  deviceId: string;
  install: string;
  uninstall: string;
  date_created: string;
  date_last_modified: string;
};

type LanguagePackage = {
  language: string;
  languagePackageVersionId: number;
  version: string; // "0.0.1"
  language_package_id: number;
  apdu_install_url: string;
  apdu_uninstall_url: string; // <= Useless
  device_versions: number[];
  se_firmware_final_versions: number[];
  bytes: number;
  date_creation: string;
  date_last_modified: string;
};

const baseURL = "https://appstore-k8s.staging.aws.ledger.fr";

// Move this to the errors file
const UserRefusedLanguagePack = createCustomErrorClass(
  "UserRefusedLanguagePack"
);
const languageIds = {
  english: 0x00,
  french: 0x01,
  spanish: 0x02,
};

const exec = async (opts: i18nJobOps) => {
  const { deviceId = "", uninstall = "", install = "" } = opts;
  const langId = uninstall || install;

  await withDevice(deviceId)((transport) => {
    return from(getDeviceInfo(transport)).pipe(
      mergeMap(async (deviceInfo: DeviceInfo) => {
        if (uninstall) {
          if (langId in languageIds) {
            await transport.send(0xe0, 0x33, languageIds[langId], 0x00);
          } else {
            console.log("i18n Unknown language", langId);
          }
          return from([]);
        }
        
        console.log({deviceInfo});

        return from([]);


        // Due to the modification to the e0010000 we have access to the language pack info,
        // we need to incorporate this information to the getDeviceInfo command above, but since
        // this is CLI and not live-common, imma hack it here for now. We only delete the id found.
        // Following https://ledgerhq.atlassian.net/wiki/spaces/TA/pages/3560375295/ARCH+Firmware+Internationalization#Package-identification
        // We attempt to extract the device locale stuff.
        // Gab comment: is this get app and version? don't we already have this abstracted and typed?
        // ansswer: yes: src\hw\getVersion
        const res = await transport.send(0xe0, 0x01, 0x00, 0x00);
        const data = res.slice(0, res.length - 2); // why remove the last 2 bytes?
        let i = 4; // targetId
        //  why the 1 + ... ? looks weird, seems like we're adding 2 + the size of the data each time, since  we also have i++
        i += 1 + data[i++]; // version
        i += 1 + data[i++]; // flags
        i += 1 + data[i++]; // mcu version
        i += 1 + data[i++]; // bootloader version
        i += 1 + 1; // hardware version

        // Prefixed ++ since we skip the size of the language id
        const languageId = data.readUIntBE(++i, 1); // <- We can extract this to deviceInfo to use in UI
        console.log(
          "i18n: Identified selected language as",
          languageId,
          ["english", "french", "spanish"][languageId]
        );

        // Get the device version from the device info, I never understood why we need this call.
        const deviceVersion = await ManagerAPI.getDeviceVersion(
          deviceInfo.targetId,
          getProviderId(deviceInfo)
        );
        console.log("i18n:", deviceVersion.id);

        // Get the information of the current firmware.
        const seFirmwareVersion = await ManagerAPI.getCurrentFirmware({
          version: deviceInfo.version,
          deviceId: deviceVersion.id,
          provider: getProviderId(deviceInfo),
        });
        console.log("i18n:", seFirmwareVersion.id);

        // Fetch available languages for this particular device.
        console.log("i18n:", "Fetching language packas for this device");
        const { data: languages }: { data: LanguagePackage[] } = await network({
          method: "POST",
          url: `${baseURL}/api/language-packages`,
          data: {
            device_version: deviceVersion.id,
            current_se_firmware_final_version: seFirmwareVersion.id,
          },
        });

        // Fetch the language packs version specified.
        const packs: LanguagePackage[] = languages.filter(
          (l: any) => l.language === langId
        );

        // Sort by version, get the first one, ideally backend would return this
        // already sorted. We don't need older language packs at all since the apdus
        // to uninstall don't change either
        packs.sort((a, b) => {
          if (gte(a.version, b.version)) return -1;
          if (gte(b.version, a.version)) return 1;
          return 0;
        });

        if (!packs.length) throw new Error(`No language ${langId} found`);
        const pack = packs[0];

        // Extract what we need from here.
        const { apdu_install_url, apdu_uninstall_url, bytes } = pack;
        const url = install ? apdu_install_url : apdu_uninstall_url;
        console.log(
          "i18n:",
          `Downloading ${bytes} bytes worth of apdus from ${url} to ${
            install ? "install" : "uninstall"
          }`
        );
        const { data: rawApdus } = await network({
          method: "GET",
          url,
        });

        // Parse the raw text response into an array of apdus
        const apdus = rawApdus.split(/\r?\n/).filter(Boolean);
        console.log("i18n:", `Received ${apdus.length} apdus`);

        // Firmware does not automatically prune the language packs and we cannot
        // rely on the "selected language" above since it may be english, so just
        // loop over the known languages until we have a better option.
        console.log("i18n:", `Deleting all the language packs`);
        const supportedLanguages = [0x00, 0x01, 0x02];
        for (const id of supportedLanguages) {
          await transport.send(
            0xe0,
            0x33,
            id,
            0x00,
            undefined,
            [0x9000, 0x5501] // Expected responses when uninstalling.
          );
        }

        // Consume the array of apdus as long as the response is 9000
        // If the apdu starts with:
        //  - e030 we are creating a new language pack [user confirmation]
        //  - e031 means we are transferring this binary data
        //  - e032 means we are marking the pack as complete
        // Once transfer is complete, language is enabled
        console.log("i18n:", `Entering apdu bulk exchange`);
        for (let i = 0; i < apdus.length; i++) {
          if (apdus[i].startsWith("e030")) {
            // Gab comment: emit event about user confirmation to the ui?
            console.log(
              "i18n:",
              "Getting user confirmation to install the package"
            );
          }
          // Gab comment: does this await only comes back after the user confirms or denies?
          const response = await transport.exchange(
            Buffer.from(apdus[i], "hex")
          );
          const status = response.readUInt16BE(response.length - 2);
          const statusStr = status.toString(16);

          // Some error handling
          if (status === 0x5501) {
            throw new UserRefusedLanguagePack(statusStr);
          } else if (status !== 0x9000) {
            throw new TransportError("Unexpected device response", statusStr);
          }
        }

        // Reaching this point means we've transferred the pack and will be auto enabled.
        return from([]);
      })
    );
  }).toPromise();
};

export default {
  description: "Test e2e functionality for device localization support",
  args: [
    deviceOpt,
    {
      name: "install",
      alias: "i",
      type: String,
      desc: "install a language pack by its id",
    },
    {
      name: "uninstall",
      alias: "u",
      type: String,
      desc: "uninstall a language pack by its id",
    },
  ],
  job: (opts: i18nJobOps): any => from(exec(opts)),
};
