import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  FeeNotLoaded,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalanceBecauseDestinationNotCreated,
  RecipientRequired,
  AmountRequired,
  FeeTooHigh,
} from "@ledgerhq/errors";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import { checkRecipientExist, isAddressValid } from "./logic";

const getTransactionStatus = async (
  a: Account,
  t: Transaction
): Promise<{
  errors: Record<string, Error>;
  warnings: Record<string, Error>;
  estimatedFees: BigNumber;
  amount: BigNumber;
  totalSpent: BigNumber;
}> => {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};
  const useAllAmount = !!t.useAllAmount;

  /* TODO: check if we need that
    if (a.pendingOperations.length > 0) {
        throw new AccountAwaitingSendPendingOperations();
    }
    */

  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (a.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else if (!isAddressValid(t.recipient)) {
    errors.recipient = new InvalidAddress();
    // TODO: should we check that?
  } else if (!(await checkRecipientExist(t.recipient))) {
    errors.recipient = new NotEnoughBalanceBecauseDestinationNotCreated();
  }
  // TODO: check if acc is multi sign

  if (t.fees === undefined || t.fees.lt(0)) {
    errors.fees = new FeeNotLoaded();
  }

  const fees = t.fees ?? new BigNumber(0);

  if (!errors.fees) {
    if (useAllAmount) {
      if (a.balance.lte(fees)) {
        errors.amount = new NotEnoughBalance();
      }
    } else {
      if (t.amount.lte(0)) {
        errors.amount = new AmountRequired();
      } else if (t.amount.plus(fees).gt(a.balance)) {
        errors.amount = new NotEnoughBalance();
      } else if (fees.gte(t.amount.times(10))) {
        errors.fees = new FeeTooHigh();
      }
    }
  }

  const isError = Object.keys(errors).length > 0;

  const amount = isError
    ? new BigNumber(0)
    : useAllAmount
    ? a.balance.minus(fees)
    : t.amount;

  const totalSpent = isError ? new BigNumber(0) : amount.plus(fees);

  const estimatedFees = isError ? new BigNumber(0) : fees;

  return {
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  };
};

export default getTransactionStatus;
