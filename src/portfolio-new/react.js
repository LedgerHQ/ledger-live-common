// @flow
import {} from "react";
import type { Account, Currency } from "../types";
import { useCountervaluesState } from "../countervalues/react";
import { getPortfolio } from "./index";
import type { PortfolioRange } from "./types";

export function usePortfolio({
  accounts,
  range,
  to,
}: {
  accounts: Account[],
  range: PortfolioRange,
  to: Currency,
}) {
  const state = useCountervaluesState();
  return getPortfolio(accounts, range, state, to);
}
