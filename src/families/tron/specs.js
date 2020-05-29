// @flow
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import expect from "expect";
import get from "lodash/get";
import type { Transaction } from "./types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";
import deviceActions from "./speculos-deviceActions";

const currency = getCryptoCurrencyById("tron");
const minimalAmount = parseCurrencyUnit(currency.units[0], "10");

const tron: AppSpec<Transaction> = {
  name: "Tron",
  currency,
  appQuery: {
    model: "nanoS",
    appName: "Tron",
    appVersion: "0.2.x",
  },
  mutations: [
    {
      name: "move 50% to another account",
      transaction: ({ account, siblings, bridge }) => {
        invariant(account.balance.gt(minimalAmount), "balance is too low");
        let t = bridge.createTransaction(account);
        const sibling = pickSiblings(siblings);
        const recipient = sibling.freshAddress;
        const amount = account.balance.div(2).integerValue();
        t = bridge.updateTransaction(t, { amount, recipient });
        return t;
      },
      deviceAction: deviceActions.acceptTransaction,
      test: ({ account, accountBeforeTransaction, operation }) => {
        expect(account.balance.toString()).toBe(
          accountBeforeTransaction.balance.minus(operation.value).toString()
        );
      },
    },
    {
      name: "send max to another account",
      transaction: ({ account, siblings, bridge }) => {
        invariant(account.balance.gt(minimalAmount), "balance is too low");
        let t = bridge.createTransaction(account);
        const sibling = pickSiblings(siblings);
        const recipient = sibling.freshAddress;
        t = bridge.updateTransaction(t, { useAllAmount: true, recipient });
        return t;
      },
      deviceAction: deviceActions.acceptTransaction,
      test: ({ account }) => {
        expect(account.balance.toString()).toBe("0");
      },
    },
    {
      name: "freeze 25% to bandwidth | energy",
      transaction: ({ account, bridge }) => {
        invariant(account.balance.gt(minimalAmount), "balance is too low");
        let t = bridge.createTransaction(account);
        const amount = account.balance.div(4).integerValue();

        const energy = get(account, `tronResources.energy`, BigNumber(0));

        t = bridge.updateTransaction(t, {
          mode: "freeze",
          amount,
          resource: energy.eq(0) ? "ENERGY" : "BANDWIDTH",
        });
        return t;
      },
      deviceAction: deviceActions.acceptTransaction,
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

        invariant(
          (bandwithExpiredAt && bandwithExpiredAt < currentDate) ||
            (energyExpiredAt && energyExpiredAt < currentDate),
          "freeze period not expired yet"
        );
        const resourceToUnfreeze =
          bandwithExpiredAt && bandwithExpiredAt < currentDate
            ? "BANDWIDTH"
            : "ENERGY";

        let t = bridge.createTransaction(account);
        t = bridge.updateTransaction(t, {
          mode: "unfreeze",
          resource: resourceToUnfreeze,
        });
        return t;
      },
      deviceAction: deviceActions.acceptTransaction,
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
  ],
};

export default { tron };
