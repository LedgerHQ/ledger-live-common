// @flow

/**
 * GOALS
 * - be non breaking changes for portfolio/index.js
 * - fix bugs like countervalues portfolio refresh issue
 * - be ready for "all time" range support
 * - more performant
 *
 * MILESTONES
 * - poc: implement the new methods
 *   - test: update the existing tests with new impl
 * - cli: port the cli
 * - react: implement a react.js
 * - perf: improve the impl to be performant
 * - finish: connect to LLD / LLM
 */

import { BigNumber } from "bignumber.js";
import type {
  AccountLikeArray,
  AccountLike,
  Account,
  AssetsDistribution,
  Currency,
} from "../types";
import { getOperationAmountNumberWithInternals } from "../operation";
import type { CounterValuesState } from "../countervalues/types";
import { calculateMany } from "../countervalues/logic";
import { flattenAccounts, getAccountCurrency } from "../account";
import { getEnv } from "../env";
import type {
  BalanceHistory,
  PortfolioRange,
  BalanceHistoryWithCountervalue,
  AccountPortfolio,
  Portfolio,
  CurrencyPortfolio,
} from "./types";
import { getPortfolioRangeConfig, getDates } from "./range";

function getPortfolioCount(
  accounts: AccountLike[],
  range: PortfolioRange
): number {
  const conf = getPortfolioRangeConfig(range);
  if (typeof conf.count === "number") return conf.count;

  const sortedAllOp = accounts
    .flatMap((a) => a.operations)
    .sort((a, b) => b.date - a.date);

  if (!sortedAllOp.length) return 0;

  const now = new Date();
  const start = conf.startOf(sortedAllOp[0].date);
  return Math.floor((now - start) / conf.increment) + 1;
}

// take back the getBalanceHistory "js"
// TODO Portfolio: Account#balanceHistory would be DROPPED and replaced in future by another impl. (perf milestone)
export function getBalanceHistory(
  account: AccountLike,
  range: PortfolioRange
): BalanceHistory {
  const count = getPortfolioCount([account], range);
  const dates = getDates(range, count);

  return dates.map((date) => {
    const balance = account.operations
      .filter((op) => op.date < date)
      .reduce(
        (prev, op) => prev.minus(getOperationAmountNumberWithInternals(op)),
        BigNumber(0)
      );

    return {
      date,
      value: BigNumber.max(balance, 0).toNumber(),
    };
  });
}

export function getBalanceHistoryWithCountervalue(
  account: AccountLike,
  range: PortfolioRange,
  countervaluesState: CounterValuesState,
  countervalueCurrency: Currency
): AccountPortfolio {
  const balanceHistory = getBalanceHistory(account, range);
  const currency = getAccountCurrency(account);

  // TODO Portfolio: accountCVstableCache?

  // TODO Portfolio: fix dataPoints arg type
  // $FlowFixMe
  const counterValues = calculateMany(countervaluesState, balanceHistory, {
    from: currency,
    to: countervalueCurrency,
  });
  const history = balanceHistory.map((h, i) => ({
    ...h,
    countervalue: counterValues[i],
  }));

  function calcChanges(h: BalanceHistoryWithCountervalue) {
    const from = h[0];
    const to = h[h.length - 1];
    return {
      countervalueReceiveSum: 0, // not available here
      countervalueSendSum: 0,
      cryptoChange: {
        value: to.value - from.value,
        percentage: null,
      },
      countervalueChange: {
        value: (to.countervalue || 0) - (from.countervalue || 0),
        percentage: meaningfulPercentage(
          (to.countervalue || 0) - (from.countervalue || 0),
          from.countervalue
        ),
      },
    };
  }

  return {
    history,
    // TODO Portfolio: countervalueAvailable
    // countervalueAvailable: !!cvRef,
    countervalueAvailable: false,
    ...calcChanges(history),
  };
}

function meaningfulPercentage(
  deltaChange: ?number,
  balanceDivider: ?number,
  percentageHighThreshold?: number = 100000
): ?number {
  if (deltaChange && balanceDivider && balanceDivider !== 0) {
    const percent = deltaChange / balanceDivider;
    if (percent < percentageHighThreshold) {
      return percent;
    }
  }
}

/**
 * calculate the total balance history for all accounts in a reference fiat unit
 * and using a CalculateCounterValue function (see countervalue helper)
 * NB the last item of the array is actually the current total balance.
 * @memberof account
 */
export function getPortfolio(
  topAccounts: Account[],
  range: PortfolioRange,
  cvState: CounterValuesState,
  cvCurrency: Currency
): Portfolio {
  const accounts = flattenAccounts(topAccounts);
  const { availables, unavailableAccounts } = accounts.reduce(
    (prev, account) => {
      const p = getBalanceHistoryWithCountervalue(
        account,
        range,
        cvState,
        cvCurrency
      );
      return p.countervalueAvailable
        ? {
            ...prev,
            available: [
              ...prev.availables,
              {
                account,
                history: p.history,
                change: p.countervalueChange,
                countervalueReceiveSum: p.countervalueReceiveSum,
                countervalueSendSum: p.countervalueSendSum,
              },
            ],
          }
        : {
            ...prev,
            unavailableAccounts: [...prev.unavailableAccounts, account],
          };
    },
    {
      availables: [],
      unavailableAccounts: [],
    }
  );

  const histories = availables.map((a) => a.history);

  const count = getPortfolioCount(accounts, range);
  const balanceHistory = getDates(range, count).map((date, i) => ({
    date,
    value: histories
      .map((h) => h[i].countervalue)
      .reduce((sum, val) => sum + (val ?? 0), 0),
  }));

  const countervalueChangeValue = availables.reduce(
    (sum, a) => sum + a.changes,
    0
  );
  const countervalueReceiveSum = availables.reduce(
    (sum, a) => sum + a.countervalueReceiveSum,
    0
  );
  const countervalueSendSum = availables.reduce(
    (sum, a) => sum + a.countervalueSendSum,
    0
  );

  // in case there were no receive, we just track the market change
  // weighted by the current balances
  const balanceDivider = getEnv("EXPERIMENTAL_ROI_CALCULATION")
    ? countervalueReceiveSum === 0
      ? balanceHistory[0].value + countervalueSendSum
      : countervalueReceiveSum
    : balanceHistory[0].value;

  return {
    balanceHistory,
    balanceAvailable: accounts.length === 0 || availables.length > 0,
    availableAccounts: availables.map((a) => a.account),
    unavailableCurrencies: [
      ...new Set(unavailableAccounts.map(getAccountCurrency)),
    ],
    accounts,
    range,
    histories,
    countervalueReceiveSum,
    countervalueSendSum,
    countervalueChange: {
      percentage: meaningfulPercentage(countervalueChangeValue, balanceDivider),
      value: countervalueChangeValue,
    },
  };
}

export function getCurrencyPortfolio(
  accounts: AccountLikeArray,
  range: PortfolioRange,
  cvState: CounterValuesState,
  cvCurrency: Currency
): CurrencyPortfolio {
  const portfolios = accounts.map((a) =>
    getBalanceHistoryWithCountervalue(a, range, cvState, cvCurrency)
  );
  const histories = portfolios.map((p) => p.history);

  return {
    history,
    countervalueAvailable:
      portfolios[portfolios.length - 1].countervalueAvailable,
    accounts,
    range,
    histories,
    cryptoChange,
    countervalueChange,
  };
}

export function getAssetsDistribution(
  topAccounts: Account[],
  countervaluesState: CounterValuesState,
  opts?: AssetsDistributionOpts
): AssetsDistribution {}
