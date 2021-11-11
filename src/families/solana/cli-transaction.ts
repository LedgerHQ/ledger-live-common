import BigNumber from "bignumber.js";
import invariant from "invariant";
import { flatMap } from "lodash";
import type { Transaction, AccountLike } from "../../types";

const options = [
  {
    name: "mode",
    type: String,
    desc: "mode of transaction: send",
  },
  {
    name: "memo",
    type: String,
    desc: "transaction note",
  },
  {
    name: "allow-unfunded-recipient",
    type: String,
    desc: "wether allow or not transfer to zero balance account",
  },
];

function inferTransactions(
  transactions: Array<{ account: AccountLike; transaction: Transaction }>,
  opts: Record<string, string>
): Transaction[] {
  const mode = opts.mode || "send";
  //console.log(transactions[0]);
  debugger;
  return [
    {
      ...transactions[0].transaction,
      amount: new BigNumber(1000000000),
      //subAccountId: "js:2:solana:AQbkEagmPgmsdAfS4X8V8UyJnXXjVPMvjeD15etqQ3Jh:solanaMain+Msaq5fkgcLAHHxbA2fF3eajmanNnBfMCPji2hm3kkDi",
    },
  ];
  invariant(mode === "send", "Only send mode is supported");
  /*
  return flatMap(transactions, ({ transaction }) => {
    invariant(transaction.family === "solana", "solana family");
    return {
      ...transaction,
      memo: opts.memo,
      allowUnFundedRecipient: opts["allow-unfunded-recipient"] !== undefined,
    };
  });
  */
}

export default {
  options,
  inferTransactions,
};
