import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";
export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;
export type RewardDestinationType =
  | "Staked"
  | "Stash"
  | "Account"
  | "Controller";
export type PolkadotNominationStatus = "active" | "inactive" | "waiting" | null;
export type PolkadotNomination = {
  address: string;
  value: BigNumber;
  status: PolkadotNominationStatus;
};
export type PolkadotNominationRaw = {
  address: string;
  value: string;
  status: PolkadotNominationStatus;
};
export type PolkadotUnlocking = {
  amount: BigNumber;
  completionDate: Date;
};
export type PolkadotUnlockingRaw = {
  amount: string;
  completionDate: string;
};
export type PolkadotResources = {
  controller: string | null | undefined;
  stash: string | null | undefined;
  nonce: number;
  lockedBalance: BigNumber;
  unlockedBalance: BigNumber;
  unlockingBalance: BigNumber;
  unlockings: PolkadotUnlocking[] | null | undefined;
  nominations: PolkadotNomination[] | null | undefined;
  numSlashingSpans: number;
};
export type PolkadotResourcesRaw = {
  controller: string | null | undefined;
  stash: string | null | undefined;
  nonce: number;
  lockedBalance: string;
  unlockedBalance: string;
  unlockingBalance: string;
  unlockings: PolkadotUnlockingRaw[] | null | undefined;
  nominations: PolkadotNominationRaw[] | null | undefined;
  numSlashingSpans: number;
};
export type Transaction = TransactionCommon & {
  mode: string;
  family: "polkadot";
  fees: BigNumber | null | undefined;
  validators: string[] | null | undefined;
  era: string | null | undefined;
  rewardDestination: string | null | undefined;
  numSlashingSpans: number | null | undefined;
};
export type TransactionRaw = TransactionCommonRaw & {
  family: "polkadot";
  mode: string;
  fees: string | null | undefined;
  validators: string[] | null | undefined;
  era: string | null | undefined;
  rewardDestination: string | null | undefined;
  numSlashingSpans: number | null | undefined;
};
export type PolkadotValidator = {
  address: string;
  identity: string;
  nominatorsCount: number;
  rewardPoints: BigNumber | null;
  commission: BigNumber;
  totalBonded: BigNumber;
  selfBonded: BigNumber;
  isElected: boolean;
  isOversubscribed: boolean;
};
export type PolkadotNominationInfo = string;
export type PolkadotStakingProgress = {
  activeEra: number;
  electionClosed: boolean;
  maxNominatorRewardedPerValidator: number;
  bondingDuration: number;
};
export type PolkadotPreloadData = {
  validators: PolkadotValidator[];
  staking: PolkadotStakingProgress | undefined;
  minimumBondBalance: string;
};
export type PolkadotSearchFilter = (
  query: string
) => (validator: PolkadotValidator) => boolean;
export const reflect = (_declare: any): void => {};
