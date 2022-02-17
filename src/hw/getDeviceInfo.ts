/* eslint-disable no-bitwise */
import {
  DeviceOnDashboardExpected,
  TransportStatusError,
} from "@ledgerhq/errors";
import { log } from "@ledgerhq/logs";
import Transport from "@ledgerhq/hw-transport";
import getVersion from "./getVersion";
import getAppAndVersion from "./getAppAndVersion";
import type { DeviceInfo, OnboardingInfo, SeedSize } from "../types/manager";
import { PROVIDERS } from "../manager/provider";
import { isDashboardName } from "./isDashboardName";
const ManagerAllowedFlag = 0x08;
const PinValidatedFlag = 0x80;

// Cf https://ledgerhq.atlassian.net/wiki/spaces/FW/pages/3258089508/Synchronous+onboarding
const onboardingFlag = 0x04;
const recoveryModeFlag = 0x01;
const seedRecoveryFlag = 0x80;
const seedSizeFlag = 0x60;
const currentWordFlag = 0x1F;
const confirmingWordsFlag = 0x01;

// const flagsList = [
//   { 
//     flagName: "onboarded",
//     path: "onboarding", // Use object-path
//     byteIndex: 0,
//     hex: 0x01,
//   },
// ]

export default async function getDeviceInfo(
  transport: Transport
): Promise<DeviceInfo> {
  const probablyOnDashboard = await getAppAndVersion(transport)
    .then(({ name }) => isDashboardName(name))
    .catch((e) => {
      if (e instanceof TransportStatusError) {
        // @ts-expect-error typescript not checking agains the instanceof
        if (e.statusCode === 0x6e00) {
          return true;
        }

        // @ts-expect-error typescript not checking agains the instanceof
        if (e.statusCode === 0x6d00) {
          return false;
        }
      }

      throw e;
    });

  if (!probablyOnDashboard) {
    throw new DeviceOnDashboardExpected();
  }

  const res = await getVersion(transport);
  const {
    isBootloader,
    rawVersion,
    targetId,
    seVersion,
    seTargetId,
    mcuBlVersion,
    mcuVersion,
    mcuTargetId,
    flags,
  } = res;
  const isOSU = rawVersion.includes("-osu");
  const version = rawVersion.replace("-osu", "");
  const m = rawVersion.match(/([0-9]+.[0-9]+)(.[0-9]+)?(-(.*))?/);
  const [, majMin, , , postDash] = m || [];
  const providerName = PROVIDERS[postDash] ? postDash : null;
  const flag = flags.length > 0 ? flags[0] : 0;
  const managerAllowed = !!(flag & ManagerAllowedFlag);
  const pinValidated = !!(flag & PinValidatedFlag);

  const getSeedSize = (seedByte, sizeFlag) => {
    const seedSizeByFlagValue = {
      64: 12,
      32: 18,
      0: 24
    };
    const flagValue = (seedByte & sizeFlag) as SeedSize

    return seedSizeByFlagValue[flagValue] || undefined;
  }

  const onboarding: OnboardingInfo = {
    isOnboarded: !!(flags[0] & onboardingFlag),
    isRecoveryMode: !!(flags[0] & recoveryModeFlag),
    isSeedRecovery: !!(flags[2] & seedRecoveryFlag),
    currentWord: (flags[2] & currentWordFlag) + 1,
    seedSize: getSeedSize(flags[2], seedSizeFlag),
    isConfirming: !!(flags[3] & confirmingWordsFlag),
  };

  log(
    "hw",
    "deviceInfo: se@" +
      version +
      " mcu@" +
      mcuVersion +
      (isOSU ? " (osu)" : isBootloader ? " (bootloader)" : "")
  );
  
  return {
    version,
    mcuVersion,
    seVersion,
    mcuBlVersion,
    majMin,
    providerName: providerName || null,
    targetId,
    seTargetId,
    mcuTargetId,
    isOSU,
    isBootloader,
    managerAllowed,
    pinValidated,
    onboarding
  };
}
