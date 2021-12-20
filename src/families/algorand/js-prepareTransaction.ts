import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import { getEstimatedFees } from "./js-getFeesForTransaction";

export const prepareTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<Transaction> => {
  let amount = transaction.amount;
  let recipient = transaction.recipient;

  if (transaction.mode === "optIn" || transaction.mode === "claimReward") {
    recipient = account.freshAddress;
    amount = new BigNumber(0);
  }

  const fees = await getEstimatedFees(account, transaction);

  return { ...transaction, fees, amount, recipient };
};
