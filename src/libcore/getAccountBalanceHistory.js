// @flow

import type { PortfolioRange } from "../types";
import type { CoreAccount } from "./types";
import { libcoreAmountToBigNumber } from "./buildBigNumber";
import { getDates, getPortfolioRange } from "../portfolio";
import { TimePeriod } from "./types";
import invariant from "invariant";

const getAccountBalanceHistory = async (
  coreAccount: CoreAccount,
  range: PortfolioRange,
  granularity: $Values<typeof TimePeriod> = 0
) => {
  const dates = getDates(range);
  const conf = getPortfolioRange(range);

  // FIXME @gre the weird date adjustment we are doing
  const to = new Date(conf.startOf(new Date()).getTime() + conf.increment - 1);

  const rawBalances = await coreAccount.getBalanceHistory(
    new Date(dates[0] - conf.increment).toISOString(),
    to.toISOString(),
    granularity
  );

  const balances = await Promise.all(
    rawBalances.map(balance => libcoreAmountToBigNumber(balance))
  );

  invariant(
    balances.length === dates.length,
    "Mismatch in sizes dates/balance"
  );

  return balances.map((value, i) => ({ date: dates[i], value }));
};

export default getAccountBalanceHistory;
