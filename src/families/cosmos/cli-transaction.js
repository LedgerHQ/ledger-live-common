// @flow
import invariant from "invariant";
import flatMap from "lodash/flatMap";
import zipWith from "lodash/zipWith";
import { BigNumber } from "bignumber.js";
import type { Transaction, AccountLike } from "../../types";
import type { CosmosDelegationInfo } from "./types";

const options = [
  {
    name: "mode",
    type: String,
    desc: "mode of transaction: send, deletage, undelegate"
  },
  {
    name: "fees",
    type: String,
    desc: "how much fees"
  },
  {
    name: "gasLimit",
    type: String,
    desc: "how much gasLimit. default is estimated with the recipient"
  },
  {
    name: "memo",
    type: String,
    desc: "add a memo to a transaction"
  },
  {
    name: "cosmosSourceValidator",
    type: String,
    desc: "for redelegate, add a source validator"
  },
  {
    name: "cosmosValidator",
    type: String,
    multiple: true,
    desc: "address of recipient validator that will receive the delegate"
  },
  {
    name: "cosmosAmountValidator",
    type: String,
    multiple: true,
    desc: "Amount that the validator will receive"
  }
];

function inferTransactions(
  transactions: Array<{ account: AccountLike, transaction: Transaction }>,
  opts: Object,
  { inferAmount }: *
): Transaction[] {
  return flatMap(transactions, ({ transaction, account }) => {
    invariant(transaction.family === "cosmos", "cosmos family");

    const validatorsAddresses: string[] = opts["cosmosValidator"] || [];
    const validatorsAmounts: BigNumber[] = (
      opts["cosmosAmountValidator"] || []
    ).map(value => {
      return inferAmount(account, value);
    });

    const validators: CosmosDelegationInfo[] = zipWith(
      validatorsAddresses,
      validatorsAmounts,
      (address, amount) => ({
        address,
        amount
      })
    );

    return {
      ...transaction,
      family: "cosmos",
      mode: opts.mode || "send",
      memo: opts.memo,
      fees: opts.fees ? inferAmount(account, opts.fees) : null,
      gasLimit: opts.gasLimit ? new BigNumber(opts.gasLimit) : null,
      validators: validators,
      cosmosSourceValidator: opts.cosmosSourceValidator
    };
  });
}

export default {
  options,
  inferTransactions
};
