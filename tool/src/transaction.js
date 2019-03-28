// @flow

import { BigNumber } from "bignumber.js";
import { parseCurrencyUnit } from "@ledgerhq/live-common/lib/currencies";

export const inferTransactionOpts = [
  {
    name: "self-transaction",
    type: Boolean,
    desc: "Pre-fill the transaction for the account to send to itself"
  },
  { name: "recipient", type: String, desc: "the address to send funds to" },
  {
    name: "amount",
    type: String,
    desc: "how much to send in the main currency unit"
  },
  { name: "feePerByte", type: String, desc: "how much fee per byte" },
  {
    name: "gasPrice",
    type: String,
    desc: "how much gasPrice in WEI unit! default is 1000000000"
  },
  {
    name: "gasLimit",
    type: String,
    desc: "how much gasLimit. default is 21000"
  }
];
export function inferTransaction(account, opts) {
  const tShared =
    account.currency.family === "bitcoin"
      ? {
          feePerByte: new BigNumber(
            opts.feePerByte === undefined ? 1 : opts.feePerByte
          )
        }
      : account.currency.family === "ethereum"
      ? {
          gasPrice: new BigNumber(
            opts.gasPrice === undefined ? 1000000000 : opts.gasPrice
          ),
          gasLimit: new BigNumber(
            opts.gasLimit === undefined ? 21000 : opts.gasLimit
          )
        }
      : null;

  if (opts["self-transaction"]) {
    return {
      amount: opts.amount
        ? parseCurrencyUnit(account.unit, opts.amount)
        : new BigNumber(1000),
      recipient: account.freshAddress,
      ...tShared
    };
  } else {
    if (!opts.amount) throw new Error("amount is required");
    if (!opts.recipient) throw new Error("recipient is required");
    return {
      amount: parseCurrencyUnit(account.unit, opts.amount),
      recipient: opts.recipient,
      ...tShared
    };
  }
}
