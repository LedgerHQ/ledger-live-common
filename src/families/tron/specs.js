// @flow
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import expect from "expect";
import type { Transaction } from "./types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";
import deviceActions from "./speculos-deviceActions";
import { NetworkDown } from "@ledgerhq/errors";

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
      test: ({
        account,
        accountBeforeTransaction,
        transaction,
        optimisticOperation,
        operation,
      }) => {
        // can be generalized!
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
      test: ({
        account,
        accountBeforeTransaction,
        transaction,
        optimisticOperation,
        operation,
      }) => {
        expect(account.balance.toString()).toBe("0");
      },
    },
    {
      name: "freeze 25% to bandwidth | energy",
      transaction: ({ account, bridge }) => {
        invariant(account.balance.gt(minimalAmount), "balance is too low");
        let t = bridge.createTransaction(account);

        const amount = account.balance.div(4).integerValue();
        t = bridge.updateTransaction(t, {
          mode: "freeze",
          amount,
          resource: account.energy.eq(0) ? "ENERGY" : "BANDWIDTH",
        });
        return t;
      },
      deviceAction: deviceActions.acceptTransaction,
      test: ({
        account,
        accountBeforeTransaction,
        transaction,
        optimisticOperation,
        operation,
      }) => {
        const resourceType = transaction.resource;
        const expectedAmount = BigNumber(transaction.amount)
          .times(10e6)
          .plus(
            accountBeforeTransaction.tronResources.frozen[`${resourceType}`]
              ? accountBeforeTransaction.tronResources.frozen[`${resourceType}`]
                  .amount
              : BigNumber(0)
          );
        expect(expectedAmount.toString()).toBe(
          account.tronResources.frozen[`${resourceType}`].amount.toString()
        );
        const expectedTP = transaction.amount.plus(
          accountBeforeTransaction.tronResources.tronPower
        );
        expect(expectedTP).toBe(account.tronResources.tronPower);
      },
    },
    {
      name: "unfreeze bandwith / energy",
      transaction: ({ account, bridge, amount }) => {
        invariant(account.tronResources.tronPower.gt(0), "no frozen assets");
        const currentDate = new Date();
        invariant(
          account.tronResources.frozen.bandwidth.expiredAt < currentDate &&
            currentDate > account.tronResources.frozen.energy.expiredAt,
          "freeze period not expired yet"
        );
        const resourceToUnfreeze =
          account.tronResources.frozen.bandwidth.expiredAt < currentDate
            ? "BANDWIDTH"
            : "ENERGY";
        let t = bridge.createTransaction(account);
        t = bridge.updateTransaction(t, {
          mode: "unfreeze",
          amount,
          resource: resourceToUnfreeze,
        });
        return t;
      },
      deviceAction: deviceActions.acceptTransaction,
      test: ({
        account,
        accountBeforeTransaction,
        transaction,
        optimisticOperation,
        operation,
      }) => {
        expect(account.tronResources.frozen).toEqual(
          expect.not.stringContaining(transaction.resource)
        );
        const expectedTronPower = accountBeforeTransaction.tronResources.tronPower.minus(
          transaction.amount
        );
        expect(account.tronResources.tronPower).toEqual(expectedTronPower);
      },
    },
  ],
};

export default { tron };
