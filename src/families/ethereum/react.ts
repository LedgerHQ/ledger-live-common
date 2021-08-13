import invariant from "invariant";
import { getGasLimit } from "./transaction";
import type { Transaction } from "./types";
import type { FeeStrategy } from "../../types";
export function useFeesStrategy(t: Transaction): FeeStrategy[] {
  const networkInfo = t.networkInfo;
  invariant(networkInfo, "no network info");
  // FIXME remove invariant and throw error
  if (!networkInfo) return [];
  const gasLimit = getGasLimit(t);
  const strategies = [
    {
      label: "slow",
      amount: networkInfo.gasPrice.min,
      displayedAmount: networkInfo.gasPrice.min.multipliedBy(gasLimit),
    },
    {
      label: "medium",
      amount: networkInfo.gasPrice.initial,
      displayedAmount: networkInfo.gasPrice.initial.multipliedBy(gasLimit),
    },
    {
      label: "fast",
      amount: networkInfo.gasPrice.max,
      displayedAmount: networkInfo.gasPrice.max.multipliedBy(gasLimit),
    },
  ];
  return strategies;
}
