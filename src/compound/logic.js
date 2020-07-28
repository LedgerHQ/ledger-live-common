// @flow
import { BigNumber } from "bignumber.js";
import { listTokensForCryptoCurrency } from "../currencies";
import type {
  TokenAccount,
  Account,
  CryptoCurrency,
  TokenCurrency,
} from "../types";
import type { CompoundAccountSummary } from "./types";

const calcInterests = (
  value: number,
  openRate: number,
  closeOrCurrentRate: number
): BigNumber => {
  const bigVal = BigNumber(value);
  return bigVal.times(closeOrCurrentRate).minus(bigVal.times(openRate));
};

export const isCompoundToken = (
  currency: CryptoCurrency,
  token: TokenCurrency
): boolean =>
  listTokensForCryptoCurrency(currency, { withDelisted: true }).some(
    (c) => c.compoundFor === token.id
  );

export function makeCompoundSummaryForAccount(
  account: TokenAccount,
  parentAccount: Account
): CompoundAccountSummary {
  const { operations } = account;

  let summary = {
    opened: [],
    closed: [],
    account,
    parentAccount,
    totalSupplied: BigNumber(0),
    allTimeEarned: BigNumber(0),
  };

  const data = operations
    .slice(0)
    .reverse()
    .reduce(
      (acc, operation) => {
        if (operation.type === "SUPPLY") {
          acc.opened.push({
            startingDate: operation.date,
            amountSupplied: operation.value,
            openRate: operation.extra.rate,
            compoundValue: operation.extra.compoundValue,
            status: "",
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
                  closeRate: operation.extra.rate,
                  endDate: operation.date,
                  startingDate: closingOperation.startingDate,
                  compoundValue: operation.extra.compoundValue,
                });
              } else {
                acc.closed.push({
                  amountSupplied: amountToClose,
                  openRate: closingOperation.openRate,
                  closeRate: operation.extra.rate,
                  endDate: operation.date,
                  startingDate: closingOperation.startingDate,
                  compoundValue: operation.extra.compoundValue,
                });
                acc.opened.unshift({
                  amountSupplied: closingOperation.amountSupplied.minus(
                    amountToClose
                  ),
                  openRate: closingOperation.openRate,
                  startingDate: closingOperation.startingDate,
                  compoundValue:
                    closingOperation.compoundValue -
                    operation.extra.compoundValue,
                  status: "",
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

  /* TODO: Fetch current rate */
  const currentRate = 0.020639854861495898;

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
            ? calcInterests(compoundValue, openRate, currentRate)
            : key === "closed"
            ? calcInterests(compoundValue, openRate, closeRate)
            : BigNumber(0);

        const percentageEarned = interestsEarned.div(amountSupplied).times(100);

        if (key === "opened") {
          summary.totalSupplied = summary.totalSupplied.plus(amountSupplied);
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

type AssetsRow = {
  name: string,
  availableBalance: BigNumber,
  APY?: number,
  grossSupply?: number,
};

export const getAssetsData = (accounts: Account[]): AssetsRow[] => {
  let assets = {};
  accounts.forEach((account) => {
    if (account.type !== "Account") return;
    if (!account.subAccounts?.length) return;

    account.subAccounts.forEach((s) => {
      if (s.type !== "TokenAccount") return;
      if (!isCompoundToken(account.currency, s.token)) return;

      const { totalSupplied, allTimeEarned } = makeCompoundSummaryForAccount(
        s,
        account
      );

      if (assets[s.token.ticker]) {
        assets[s.token.ticker]["balance"] = assets[s.token.ticker][
          "availableBalance"
        ].plus(s.balance.minus(totalSupplied));
      } else {
        assets[s.token.ticker] = {
          name: s.token.name,
          availableBalance: s.balance.plus(allTimeEarned).minus(totalSupplied), // TODO: not good here
          // grossSupply: ??
          // APY: ??
        };
      }
    });
  });

  return Object.keys(assets).reduce((rows, key) => {
    return rows.concat(assets[key]);
  }, []);
};
