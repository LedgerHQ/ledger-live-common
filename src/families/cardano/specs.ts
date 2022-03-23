import expect from "expect";
import type { AppSpec } from "../../bot/types";
import type { Transaction } from "./types";
import { pickSiblings } from "../../bot/specs";
import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { DeviceModelId } from "@ledgerhq/devices";
import BigNumber from "bignumber.js";

const cardano: AppSpec<Transaction> = {
  name: "cardano",
  currency: getCryptoCurrencyById("cardano"),
  appQuery: {
    model: DeviceModelId.nanoS,
    appName: "CardanoADA",
  },
  mutations: [
    {
      name: "move ~50%",
      maxRun: 1,
      transaction: ({ account, siblings, bridge }) => {
        const sibling = pickSiblings(siblings, 4);
        const recipient = sibling.freshAddress;
        const transaction = bridge.createTransaction(account);

        const updates = [
          { amount: new BigNumber(account.balance.dividedBy(2)) },
          { recipient },
        ];
        return {
          transaction,
          updates,
        };
      },
      test: ({ account, accountBeforeTransaction, operation }) => {
        expect(account.balance.toString()).toBe(
          accountBeforeTransaction.balance.minus(operation.value).toString()
        );
      },
    },
  ],
};

export default { cardano };
