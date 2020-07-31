// @flow
import type { DeviceAction } from "../../bot/types";
import type { Transaction } from "./types";
// import { formatCurrencyUnit } from "../../currencies";
import { deviceActionFlow } from "../../bot/specs";

// Will be useful when unit is gonna be algo
// const expectedAmount = ({ account, status }) =>
//   formatCurrencyUnit(account.unit, status.amount, {
//     disableRounding: true,
//   });

const acceptTransaction: DeviceAction<Transaction, *> = deviceActionFlow({
  steps: [
    {
      title: "Txn Type",
      button: "Rr",
      // expectedValue: ({ transaction }) => transaction.subAccountId ? "Asset xfer" : "Payment",
    },
    {
      title: "Asset xfer",
      button: "Rr",
    },
    {
      title: "Payment",
      button: "Rr",
    },
    {
      title: "Fee",
      button: "Rr",
      // // expectedValue: ({ account, status }) =>
      //   formatCurrencyUnit(account.unit, status.estimatedFees, {
      //     disableRounding: true,
      //   }), this is gonna be this one on nano 1.3
      // expectedValue: ({status}) => status.estimatedFees.toString()
    },
    {
      title: "Asset ID",
      button: "Rr",
      expectedValue: ({ transaction }) =>
        transaction.assetId ||
        (transaction.subAccountId
          ? transaction.subAccountId.split("/")[2]
          : ""),
    },
    {
      title: "Asset amt",
      button: "Rr",
      // expectedValue: ({transaction}) => transaction.mode === "optIn" ? "0" : transaction.amount.toString()
    },
    {
      title: "Receiver",
      button: "Rr",
      expectedValue: ({ transaction }) => transaction.recipient,
    },
    {
      title: "Asset dst",
      button: "Rr",
      expectedValue: ({ transaction }) => transaction.recipient,
    },
    {
      title: "Amount",
      button: "Rr",
      expectedValue: ({ status, transaction }) =>
        transaction.mode === "claimReward"
          ? "0"
          : transaction.useAllAmount
          ? status.amount.toString()
          : transaction.amount.toString(),
    },
    {
      title: "Sign",
      button: "LRlr",
    },
    {
      title: "Review",
      button: "Rr",
    },
    {
      title: "Genesis ID",
      button: "Rr",
    }, // Only on testnet
    {
      title: "Genesis hash",
      button: "Rr",
    }, // Only on testnet
  ],
});

export default { acceptTransaction };
