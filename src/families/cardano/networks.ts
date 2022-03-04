import type { CardanoLikeNetworkParameters } from "./types";

export const getNetworkParameters = (
  networkName: string
): CardanoLikeNetworkParameters => {
  if (networkName === "cardano") {
    return {
      identifier: "cardano",
      chainStartTime: 1506203091000,
      byronSlotDuration: 20000,
      byronSlotsPerEpoch: 21600,
      shelleyStartEpoch: 208,
      shelleySlotDuration: 1000,
      shelleySlotsPerEpoch: 432000,
    };
  } else if (networkName === "cardano_testnet") {
    return {
      identifier: "cardano_testnet",
      chainStartTime: 1563999616000,
      byronSlotDuration: 20000,
      byronSlotsPerEpoch: 21600,
      shelleyStartEpoch: 74,
      shelleySlotDuration: 1000,
      shelleySlotsPerEpoch: 432000,
    };
  }

  throw new Error("No network parameters set for " + networkName);
};
