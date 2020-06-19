// @flow
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import expect from "expect";
import sortBy from "lodash/sortBy";
import sampleSize from "lodash/sampleSize";
import get from "lodash/get";
import type { Transaction } from "./types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { getTronSuperRepresentatives } from "../../api/Tron";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";

const currency = getCryptoCurrencyById("tron");
const minimalAmount = parseCurrencyUnit(currency.units[0], "10");

let superRepresentatives;

getTronSuperRepresentatives().then((r) => (superRepresentatives = r));

const tron: AppSpec<Transaction> = {
  name: "Tron",
  currency,
  appQuery: {
    model: "nanoS",
    appName: "Tron",
  },
  mutations: [
    {
      name: "move 50% to another account",
      transaction: ({ account, siblings, bridge, maxSpendable }) => {
        invariant(maxSpendable.gt(minimalAmount), "balance is too low");
        const sibling = pickSiblings(siblings);
        const recipient = sibling.freshAddress;
        const amount = maxSpendable.div(2).integerValue();
        return {
          transaction: bridge.createTransaction(account),
          updates: [{ recipient }, { amount }],
        };
      },
      test: ({ accountBeforeTransaction, operation, account }) => {
        expect(account.spendableBalance.toString()).toBe(
          accountBeforeTransaction.balance.minus(operation.value).toString()
        );
      },
    },
    {
      name: "send max to another account",
      transaction: ({ account, siblings, bridge, maxSpendable }) => {
        invariant(maxSpendable.gt(minimalAmount), "balance is too low");
        const sibling = pickSiblings(siblings);
        const recipient = sibling.freshAddress;
        return {
          transaction: bridge.createTransaction(account),
          updates: [{ recipient }, { useAllAmount: true }],
        };
      },
      test: ({ account }) => {
        expect(account.spendableBalance.toString()).toBe("0");
      },
    },
    {
      name: "freeze 25% to bandwidth | energy",
      transaction: ({ account, bridge, maxSpendable }) => {
        invariant(maxSpendable.gt(minimalAmount), "balance is too low");
        const amount = maxSpendable.div(4).integerValue();
        const energy = get(account, `tronResources.energy`, BigNumber(0));
        return {
          transaction: bridge.createTransaction(account),
          updates: [
            { mode: "freeze" },
            { resource: energy.eq(0) ? "ENERGY" : "BANDWIDTH" },
            { amount },
          ],
        };
      },
      test: ({ account, accountBeforeTransaction, transaction }) => {
        const resourceType = transaction.resource || "";

        // We need Lenses or Getter for this 😱
        const resourceBeforeTransaction = get(
          accountBeforeTransaction,
          `tronResources.frozen.${resourceType}.amount`,
          BigNumber(0)
        );

        const expectedAmount = BigNumber(transaction.amount)
          .times(10e6)
          .plus(resourceBeforeTransaction);

        const currentRessourceAmount = get(
          account,
          `tronResources.frozen.${resourceType}.amount`,
          BigNumber(0)
        );

        expect(expectedAmount.toString()).toBe(
          currentRessourceAmount.toString()
        );

        const TPBefore = get(
          accountBeforeTransaction,
          "tronResources.tronPower",
          BigNumber(0)
        );
        const currentTP = get(account, "tronResources.tronPower", "0");
        const expectedTP = transaction.amount.plus(TPBefore);
        expect(expectedTP.toString()).toBe(currentTP);
      },
    },
    {
      name: "unfreeze bandwith / energy",
      transaction: ({ account, bridge }) => {
        const TP = BigNumber(get(account, "tronResources.tronPower", "0"));
        invariant(TP.gt(0), "no frozen assets");
        const currentDate = new Date();
        const bandwithExpiredAt = get(
          account,
          "tronResources.frozen.bandwidth.expiredAt",
          undefined
        );
        const energyExpiredAt = get(
          account,
          "tronResources.frozen.energy.expiredAt",
          undefined
        );
        // To be rewrited using helper
        invariant(
          (bandwithExpiredAt && bandwithExpiredAt < currentDate) ||
            (energyExpiredAt && energyExpiredAt < currentDate),
          "freeze period not expired yet"
        );
        const resourceToUnfreeze =
          bandwithExpiredAt && bandwithExpiredAt < currentDate
            ? "BANDWIDTH"
            : "ENERGY";

        return {
          transaction: bridge.createTransaction(account),
          updates: [{ mode: "unfreeze" }, { resource: resourceToUnfreeze }],
        };
      },
      test: ({ account, accountBeforeTransaction, transaction }) => {
        const TxResource = transaction.resource || "";

        const currentFrozen = get(
          account,
          `tronResources.frozen.${TxResource}`,
          {}
        );

        expect(currentFrozen).toBeUndefined();

        const TPBeforeTx = BigNumber(
          get(accountBeforeTransaction, "tronResources.tronPower", 0)
        );
        const currentTP = BigNumber(get(account, "tronResources.tronPower", 0));

        const expectedTronPower = TPBeforeTx.minus(transaction.amount);
        expect(currentTP).toEqual(expectedTronPower);
      },
    },
    {
      name: "submit vote",
      transaction: ({ account, bridge }) => {
        const TP = BigNumber(get(account, "tronResources.tronPower", "0"));
        invariant(TP.gt(0), "no tron power to vote");

        const currentTPVoted = get(account, "tronResources.votes", []).reduce(
          (acc, curr) => acc.plus(BigNumber(get(curr, "voteCount", 0))),
          BigNumber(0)
        );

        invariant(TP.gt(currentTPVoted), "you have no tron power left");
        invariant(
          superRepresentatives && superRepresentatives.length,
          "there are no super representatives to vote for, or the list has not been loaded yet"
        );

        const count = 1 + Math.floor(5 * Math.random());
        const candidates = sampleSize(superRepresentatives.slice(0, 40), count);
        let remaining = TP;
        const votes = candidates.map((c) => {
          const voteCount = remaining
            .times(Math.random())
            .integerValue()
            .toNumber();

          remaining = remaining.minus(voteCount);
          return {
            address: c.address,
            voteCount,
          };
        });

        return {
          transaction: bridge.createTransaction(account),
          updates: [{ mode: "vote" }, { votes }],
        };
      },
      test: ({ account, transaction }) => {
        const votes = sortBy(transaction.votes, ["address"]);
        const currentVotes = sortBy(get(account, "tronResources.votes", []), [
          "address",
        ]);
        expect(currentVotes).toEqual(votes);
      },
    },
  ],
};

export default { tron };
