import type { DeviceAction } from "../../bot/types";
import type { Transaction } from "./types";
import { deviceActionFlow } from "../../bot/specs";
import { formatCurrencyUnit } from "../../currencies";

const acceptTransaction: DeviceAction<Transaction, any> = deviceActionFlow({
  steps: [
    {
      title: "To [1/2]",
      button: "Rr",
    },
    {
      title: "To [2/2]",
      button: "Rr",
    },
    {
      title: "From [1/2]",
      button: "Rr",
    },
    {
      title: "From [2/2]",
      button: "Rr",
    },
    {
      title: "Nonce",
      button: "Rr",
      expectedValue: ({ transaction }) => transaction.nonce.toString(),
    },
    {
      title: "Value",
      button: "Rr",
      expectedValue: ({ account, transaction }) =>
        formatCurrencyUnit(account.unit, transaction.amount, {
          disableRounding: true,
        }),
    },
    {
      title: "Gas Limit",
      button: "Rr",
      expectedValue: ({ transaction }) => transaction.gasLimit.toFixed(),
    },
    {
      title: "Gas Premium",
      button: "Rr",
      expectedValue: ({ account, transaction }) =>
        formatCurrencyUnit(account.unit, transaction.gasPremium, {
          disableRounding: true,
        }),
    },
    {
      title: "Gas Fee Cap",
      button: "Rr",
      expectedValue: ({ account, transaction }) =>
        formatCurrencyUnit(account.unit, transaction.gasFeeCap, {
          disableRounding: true,
        }),
    },
    {
      title: "Approve",
      button: "LRlr",
    },
  ],
});

export default { acceptTransaction };
