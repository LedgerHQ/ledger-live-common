import invariant from "invariant";
import type { Transaction } from "./types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";
import { DeviceModelId } from "@ledgerhq/devices";

const sharedMutations = ({ maxAccount }) => [
  {
    name: "move 50%",
    maxRun: 2,
    transaction: ({ account, siblings, bridge }) => {
      const sibling = pickSiblings(siblings, maxAccount);
      const recipient = sibling.freshAddress;
      const amount = account.balance.div(2).integerValue();
      return {
        transaction: bridge.createTransaction(account),
        updates: [{ recipient, amount }],
      };
    },
  },
];

const celo: AppSpec<Transaction> = {
  name: "Celo",
  currency: getCryptoCurrencyById("celo"),
  appQuery: {
    model: DeviceModelId.nanoS,
    appName: "celo",
  },
  testTimeout: 4 * 60 * 1000,
  transactionCheck: ({ maxSpendable }) => {
    invariant(
      maxSpendable.gt(
        parseCurrencyUnit(getCryptoCurrencyById("celo").units[0], "0.001")
      ),
      "balance is too low"
    );
  },
  mutations: sharedMutations({ maxAccount: 3 }),
};

export default {
  celo,
};
