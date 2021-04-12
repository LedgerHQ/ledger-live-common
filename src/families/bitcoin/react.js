// @flow
import invariant from "invariant";
import type { Transaction } from "./types";
import type { FeeStrategy, Account } from "../../types";

const replaceLabel = [
  {
    from: "low",
    to: "slow",
  },
  { from: "standard", to: "medium" },
  { from: "high", to: "fast" },
];

export const useFeesStrategy = (a: Account, t: Transaction): FeeStrategy[] => {
  const networkInfo = t.networkInfo;
  invariant(networkInfo, "no network info");

  const strategies = networkInfo.feeItems.items
    .map((feeItem) => {
      return {
        label:
          replaceLabel.find((r) => r.from === feeItem.speed)?.to ||
          feeItem.speed,
        amount: feeItem.feePerByte,
        unit: a.currency.units[a.currency.units.length - 1], // Should be sat
      };
    })
    .reverse();

  return strategies;
};
