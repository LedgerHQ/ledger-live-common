// @flow
import { getPortfolioCount } from "../portfolio-new";
import { getPortfolioRangeConfig } from "../portfolio-new/range";
import type { AccountLike } from "../types";
import { genAccount } from "../mock/account";

describe("Portfolio", () => {
  describe("getPortfolioCount", () => {
    const accounts: AccountLike[] = Array.from({ length: 100 }).map((_, j) =>
      genAccount("portfolio_" + j)
    );

    describe("default count", () => {
      ["year", "month", "week", "day"].forEach((range) => {
        it(`shoud return default count (${range})`, () => {
          const res = getPortfolioCount(accounts, range);
          const count = getPortfolioRangeConfig(range).count;
          expect(res).toBe(count);
        });
      });
    });

    describe("all time", () => {
      const range = "all";
      // TODO Portfolio: How to test it dynamically? (now: new Date())
      // it("should return calculated count", () => {
      //   const _accounts: AccountLike[] = [
      //     {
      //       ...genAccount("portfolio_1"),
      //       creationDate: new Date("2008-10-31"),
      //     },
      //     ...accounts.slice(1, accounts.length - 1),
      //   ];
      //   const res = getPortfolioCount(_accounts, range);
      //   expect(res).toBe();
      // });

      it("should return at least a year", () => {
        const res = getPortfolioCount(accounts, range);
        const count = getPortfolioRangeConfig("year").count;
        expect(res).toBe(count);
      });
    });
  });

  describe("getBalanceHistory", () => {});

  describe("getBalanceHistoryWithCountervalue", () => {});

  describe("getPortfolio", () => {});

  describe("getCurrencyPortfolio", () => {});

  describe("getAssetsDistribution", () => {});
});
