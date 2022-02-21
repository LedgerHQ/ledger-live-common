export type SeedSize = 12 | 18 | 24;

export type OnboardingInfo = {
  isOnboarded?: boolean;
  // in recovery mode vs in normal mode
  isRecoveryMode?: boolean;
  // seed Recovery vs new seed
  isSeedRecovery?: boolean;
  // confirming vs writing
  isConfirming?: boolean;
  seedSize?: SeedSize;
  // Starting from 1 to totalNbSeedWords
  currentWord?: number;
};
