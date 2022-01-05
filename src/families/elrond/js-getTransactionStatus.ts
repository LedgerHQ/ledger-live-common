import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  RecipientRequired,
  InvalidAddress,
  FeeNotLoaded,
  InvalidAddressBecauseDestinationIsAlsoSource,
  FeeTooHigh,
} from "@ledgerhq/errors";
import type { Account, TransactionStatus } from "../../types";
import type { Transaction } from "./types";
import { isValidAddress, isSelfTransaction } from "./logic";
import getEstimatedFees from "./js-getFeesForTransaction";

const getTransactionStatus = async (
  a: Account,
  t: Transaction
): Promise<TransactionStatus> => {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};
  const useAllAmount = !!t.useAllAmount;

  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (isSelfTransaction(a, t)) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else if (!isValidAddress(t.recipient)) {
    errors.recipient = new InvalidAddress();
  }

  if (!t.fees) {
    errors.fees = new FeeNotLoaded();
  }

  const estimatedFees = await getEstimatedFees(t);
  if (estimatedFees.gt(a.balance)) {
    errors.amount = new NotEnoughBalance();
  }

  let amount, totalSpent;
  const tokenAccount =
    t.subAccountId &&
    a.subAccounts &&
    a.subAccounts.find((ta) => ta.id === t.subAccountId);

  if (tokenAccount) {
    amount = useAllAmount
      ? tokenAccount.balance
      : t.amount;

    totalSpent = amount

    if (totalSpent.gt(tokenAccount.balance)) {
      errors.amount = new NotEnoughBalance();
    }

  } else {
    totalSpent = useAllAmount
      ? a.balance
      : new BigNumber(t.amount).plus(estimatedFees);

    amount = useAllAmount
      ? a.balance.minus(estimatedFees)
      : new BigNumber(t.amount);

    if (totalSpent.gt(a.balance)) {
      errors.amount = new NotEnoughBalance();
    }

    if (amount.div(10).lt(estimatedFees)) {
      warnings.feeTooHigh = new FeeTooHigh();
    }
  }


  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  });
};

export default getTransactionStatus;
