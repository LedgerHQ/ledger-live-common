// @flow
import Transaction from "@hashgraph/sdk";
import { Client, AccountBalanceQuery } from "@hashgraph/sdk";

let client = Client.forTestnet();

// capabilities of hedera on a Ledger?
export const getOperations = () => {
  return ["Sign Transaction", "Get Public Key", "Verify Account"];
};

// Transaction.execute
// https://docs.hedera.com/guides/docs/sdks/transactions/submit-a-transaction
export const submit = () => {};

// fiat, stored on chain
export const getFees = async () => {
  const queryCost = await new AccountBalanceQuery()
    .setAccountId(client.operatorAccountId)
    .getCost(client);

  return queryCost;
};

export const getAccount = async () => {
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(client.operatorAccountId)
    .execute(client);

  return {
    balance: accountBalance.hbars,
    additionalBalance: accountBalance.tokens
  };
};

// Doesn't compute
export const getPreloadedData = () => {
  throw new Error("getPreloadedData not implemented");
};

// ?
export const disconnect = () => {
  throw new Error("disconnect not implemented");
};
