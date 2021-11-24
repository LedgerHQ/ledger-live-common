import type { Transaction } from "./types";
import type { Account } from "../../types";
import { CeloTx } from "@celo/connect";
import { celoKit } from "./api/sdk";

const buildTransaction = async (account: Account, transaction: Transaction) => {
  const kit = celoKit();
  const { amount } = transaction;
  const value = (
    transaction.useAllAmount
      ? account.spendableBalance.minus(transaction.fees || 0)
      : amount
  ).toString();

  const celoTransaction: CeloTx = {
    from: account.freshAddress,
    value,
    to: transaction.recipient,
  };

  // This fetches nonce and chainId from a node
  return await kit.connection.paramsPopulator.populate(celoTransaction);
};

export default buildTransaction;
