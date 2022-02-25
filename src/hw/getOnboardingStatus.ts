/* eslint-disable no-bitwise */
import type { OnboardingInfo, SeedSize } from "../types/onboarding";

// Cf https://ledgerhq.atlassian.net/wiki/spaces/FW/pages/3258089508/Synchronous+onboarding
const onboardingFlag = 0x04;
const recoveryModeFlag = 0x01;
const seedRecoveryFlag = 0x80;
const seedSizeFlag = 0x60;
const currentWordFlag = 0x1f;
const confirmingWordsFlag = 0x01;

export default function getOnboardingStatus(flags: Buffer
): OnboardingInfo {
  if (!flags || flags.length < 4) {
    return {};
  }

  const getSeedSize = (seedByte, sizeFlag) => {
    const seedSizeByFlagValue = {
      64: 12,
      32: 18,
      0: 24,
    };
    const flagValue = (seedByte & sizeFlag) as SeedSize;

    return seedSizeByFlagValue[flagValue] || undefined;
  };

  const onboarding: OnboardingInfo = {
    isOnboarded: !!(flags[0] & onboardingFlag),
    isRecoveryMode: !!(flags[0] & recoveryModeFlag),
    isSeedRecovery: !!(flags[2] & seedRecoveryFlag),
    currentWord: (flags[2] & currentWordFlag) + 1,
    seedSize: getSeedSize(flags[2], seedSizeFlag),
    isConfirming: !!(flags[3] & confirmingWordsFlag),
  };

  return onboarding;
}
