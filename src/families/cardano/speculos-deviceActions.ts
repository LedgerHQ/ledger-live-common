import type { DeviceAction } from "../../bot/types";
import type { Transaction } from "./types";
import { formatCurrencyUnit } from "../../currencies";
import { deviceActionFlow } from "../../bot/specs";

const expectedAmount = ({ account, status }) =>
  formatCurrencyUnit(account.unit, status.amount, {
    disableRounding: true,
  }) + " ADA";

const acceptTransaction: DeviceAction<Transaction, any> = deviceActionFlow({
  steps: [
    {
      title: "New transaction",
      button: "LRlr",
    },
    {
      title: "Start new transaction?",
      button: "LRlr",
      expectedValue: expectedAmount,
    },
    {
      title: "Send to address",
      button: "LRlr",
      expectedValue: ({ transaction }) => transaction.recipient,
    },
    {
      title: "Send",
      button: "LRlr",
      //TODO: address will not fit in single screen
      expectedValue: ({ transaction }) => transaction.amount.toString(),
    },
    {
      title: "Transaction fee",
      button: "LRlr",
      expectedValue: ({ account, status }) =>
        formatCurrencyUnit(account.unit, status.estimatedFees, {
          showAllDigits: true,
          showCode: true,
        }),
    },
    {
      title: "Transaction TTL",
      button: "LRlr",
      //TODO: expectedValue TTL from builtTransaction
    },
    {
      title: "Confirm transaction?",
      button: "LRlr",
    },
  ],
});

export default { acceptTransaction };
