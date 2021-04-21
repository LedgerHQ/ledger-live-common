// @flow

import { BigNumber } from "bignumber.js";
import type {
  BalanceHistoryCache,
  BalanceHistoryDataCache,
  AccountLike,
  Account,
  SubAccount,
  GranularityId,
} from "../types";
import { getOperationAmountNumberWithInternals } from "../operation";
import {
  weekIncrement,
  dayIncrement,
  hourIncrement,
  startOfWeek,
  startOfDay,
  startOfHour,
} from "../portfolio/range";

export const emptyHistoryCache = {
  HOUR: {
    latestDate: null,
    balances: [],
  },
  DAY: {
    latestDate: null,
    balances: [],
  },
  WEEK: {
    latestDate: null,
    balances: [],
  },
};

const conf = {
  WEEK: {
    increment: weekIncrement,
    startOf: startOfWeek,
  },
  DAY: {
    increment: dayIncrement,
    startOf: startOfDay,
  },
  HOUR: {
    increment: hourIncrement,
    startOf: startOfHour,
  },
};

function generateHistoryFromOperationsG(
  account: AccountLike,
  g: GranularityId
): BalanceHistoryDataCache {
  const { increment, startOf } = conf[g];
  const latestDate = startOf(new Date()).getTime();
  const balances = [];
  let { balance } = account;
  const operationsLength = account.operations.length;
  let date = latestDate;
  for (let i = 0; i < operationsLength; ) {
    // accumulate operations after time t
    while (i < operationsLength && account.operations[i].date > date) {
      balance = balance.minus(
        getOperationAmountNumberWithInternals(account.operations[i])
      );
      i++;
    }
    balances.unshift(BigNumber.max(balance, 0).toNumber());
    date -= increment;
  }
  return { balances, latestDate };
}

export function generateHistoryFromOperations(
  account: AccountLike
): BalanceHistoryCache {
  return {
    HOUR: generateHistoryFromOperationsG(account, "HOUR"),
    DAY: generateHistoryFromOperationsG(account, "DAY"),
    WEEK: generateHistoryFromOperationsG(account, "WEEK"),
  };
}

export function getAccountHistoryBalances(
  account: AccountLike,
  g: GranularityId
): number[] {
  const { balances, latestDate } = account.balanceHistoryCache[g];
  const { startOf } = conf[g];
  if (latestDate && latestDate === startOf(new Date()).getTime()) {
    return balances;
  }
  console.warn("account cache was not up to date. recalculating on the fly");
  return generateHistoryFromOperationsG(account, g).balances;
}

export function recalculateAccountBalanceHistories(
  res: Account,
  prev: Account
): Account {
  // recalculate balance history cache
  if (prev.balanceHistoryCache === res.balanceHistoryCache) {
    // we only regenerate if it was not overriden by the implemenetation.
    res = { ...res, balanceHistoryCache: generateHistoryFromOperations(res) };
  }
  const prevSubAccounts = prev.subAccounts;
  const nextSubAccounts = res.subAccounts;
  if (
    nextSubAccounts &&
    prevSubAccounts &&
    prevSubAccounts !== nextSubAccounts
  ) {
    // when sub accounts changes, we need to recalculate
    res.subAccounts = nextSubAccounts.map(
      (subAccount: SubAccount): SubAccount => {
        const old = prevSubAccounts.find((a) => a.id === subAccount.id);
        if (
          !old ||
          old.balanceHistoryCache === subAccount.balanceHistoryCache
        ) {
          // we only regenerate if it was not overriden by the implemenetation.
          subAccount = {
            ...subAccount,
            balanceHistoryCache: generateHistoryFromOperations(subAccount),
          };
        }
        return subAccount;
      }
    );
  }

  return res;
}
