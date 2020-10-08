// @flow
import { BigNumber } from "bignumber.js";
import { findCompoundToken } from "../currencies";
import type { TokenAccount, Account } from "../types";
import type { CompoundAccountSummary, ClosedLoansHistory } from "./types";
import { findCurrentRate } from "../families/ethereum/modules/compound";

// to confirm in practice if this threshold is high enough / too high
const unlimitedThreshold = BigNumber(2).pow(250);

export function getAccountCapabilities(
  account: TokenAccount
): {
  enabledAmount: BigNumber,
  enabledAmountIsUnlimited: boolean,
  canSupply: boolean,
  canSupplyMax: boolean,
  canWithdraw: boolean,
} {
  const { token } = account;
  const ctoken = findCompoundToken(token);
  if (!ctoken) {
    return {
      enabledAmount: BigNumber(0),
      enabledAmountIsUnlimited: false,
      canSupply: false,
      canSupplyMax: false,
      canWithdraw: false,
    };
  }

  const approval = (account.approvals || []).find(
    (a) => a.sender.toLowerCase() === ctoken.contractAddress.toLowerCase()
  );
  const enabledAmount = approval ? BigNumber(approval.value) : BigNumber(0);
  const enabledAmountIsUnlimited = enabledAmount.gt(unlimitedThreshold);
  const canSupply = enabledAmount.gt(0) && account.spendableBalance.gt(0);
  const canSupplyMax = canSupply && account.spendableBalance.lte(enabledAmount);
  const cdaiBalanceInDai = account.balance.minus(account.spendableBalance);
  const canWithdraw = cdaiBalanceInDai.gt(0);
  return {
    enabledAmount,
    enabledAmountIsUnlimited,
    // can supply at least the full amount of the balance
    canSupplyMax,
    // can supply anything at all
    canSupply,
    // can withdraw anything at all
    canWithdraw,
  };
}

const calcInterests = (
  value: BigNumber,
  openRate: BigNumber,
  closeOrCurrentRate: BigNumber
): BigNumber => {
  return value.times(closeOrCurrentRate).minus(value.times(openRate));
};

export function makeCompoundSummaryForAccount(
  account: TokenAccount,
  parentAccount: ?Account
): CompoundAccountSummary {
  const { operations } = account;

  // FIXME flowtype coverage is bad here

  let summary = {
    opened: [],
    closed: [],
    account,
    parentAccount,
    totalSupplied: BigNumber(0),
    allTimeEarned: BigNumber(0),
    accruedInterests: BigNumber(0),
  };

  const currentRate = findCurrentRate(account.token);
  if (!currentRate) return summary;

  const data = operations
    .slice(0)
    .reverse()
    .reduce(
      (acc, operation) => {
        if (operation.type === "SUPPLY") {
          acc.opened.push({
            startingDate: operation.date,
            amountSupplied: operation.value,
            openRate: BigNumber(operation.extra.rate),
            compoundValue: BigNumber(operation.extra.compoundValue),
          });

          return acc;
        }

        if (operation.type === "REDEEM") {
          let amountToClose = operation.value;
          while (amountToClose.gt(0)) {
            const closingOperation = acc.opened.shift();
            if (closingOperation) {
              if (amountToClose.gte(closingOperation.amountSupplied)) {
                acc.closed.push({
                  amountSupplied: closingOperation.amountSupplied,
                  openRate: closingOperation.openRate,
                  closeRate: BigNumber(operation.extra.rate),
                  endDate: operation.date,
                  startingDate: closingOperation.startingDate,
                  compoundValue: BigNumber(operation.extra.compoundValue),
                });
              } else {
                acc.closed.push({
                  amountSupplied: amountToClose,
                  openRate: closingOperation.openRate,
                  closeRate: BigNumber(operation.extra.rate),
                  endDate: operation.date,
                  startingDate: closingOperation.startingDate,
                  compoundValue: BigNumber(operation.extra.compoundValue),
                });
                acc.opened.unshift({
                  amountSupplied: closingOperation.amountSupplied.minus(
                    amountToClose
                  ),
                  openRate: closingOperation.openRate,
                  startingDate: closingOperation.startingDate,
                  compoundValue: closingOperation.compoundValue.minus(
                    BigNumber(operation.extra.compoundValue)
                  ),
                });
              }

              amountToClose = amountToClose.minus(
                closingOperation.amountSupplied
              );
            }
          }
        }

        return acc;
      },
      { opened: [], closed: [] }
    );

  for (let key in data) {
    const current = data[key].map(
      ({
        amountSupplied,
        startingDate,
        endDate,
        compoundValue,
        openRate,
        closeRate,
        status,
      }) => {
        const interestsEarned =
          key === "opened"
            ? calcInterests(compoundValue, openRate, currentRate.rate)
            : key === "closed"
            ? calcInterests(compoundValue, openRate, closeRate)
            : BigNumber(0);

        const percentageEarned = interestsEarned.div(amountSupplied).times(100);

        if (key === "opened") {
          summary.totalSupplied = summary.totalSupplied.plus(amountSupplied);
          summary.accruedInterests = summary.accruedInterests.plus(
            interestsEarned
          );
        }

        summary.allTimeEarned = summary.allTimeEarned.plus(interestsEarned);

        return {
          startingDate,
          endDate,
          amountSupplied,
          interestsEarned,
          percentageEarned,
          status,
        };
      }
    );
    summary[key] = summary[key].concat(current);
  }

  return summary;
}

export const makeClosedHistoryForAccounts = (
  summaries: CompoundAccountSummary[]
): ClosedLoansHistory =>
  summaries
    .reduce((closedLoans, summary) => {
      if (!summary.closed.length) return closedLoans;

      return closedLoans.concat(
        summary.closed.map((c) => ({
          ...c,
          account: summary.account,
          parentAccount: summary.parentAccount,
        }))
      );
    }, [])
    .sort((a, b) => {
      return a.endDate.getTime() - b.endDate.getTime();
    });
