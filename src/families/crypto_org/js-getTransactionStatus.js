// @flow
import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  RecipientRequired,
  InvalidAddress,
  FeeNotLoaded,
  AmountRequired,
} from "@ledgerhq/errors";
import type { Account, TransactionStatus } from "../../types";
import type { Transaction } from "./types";
import { isValidAddress, TESTNET_CURRENCY_ID } from "./logic";

const getTransactionStatus = async (
  a: Account,
  t: Transaction
): Promise<TransactionStatus> => {
  const errors = {};
  const warnings = {};
  const useAllAmount = !!t.useAllAmount;

  if (!t.fees) {
    errors.fees = new FeeNotLoaded();
  }

  const estimatedFees = t.fees || BigNumber(0);

  const totalSpent = useAllAmount
    ? a.balance
    : BigNumber(t.amount).plus(estimatedFees);

  const amount = useAllAmount
    ? a.balance.minus(estimatedFees)
    : BigNumber(t.amount);

  if (totalSpent.gt(a.balance)) {
    errors.amount = new NotEnoughBalance();
  }

  if (!t.amount.gt(0)) {
    errors.amount = new AmountRequired();
  }

  const useTestNet = a.currency.id == TESTNET_CURRENCY_ID ? true : false;
  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (!isValidAddress(t.recipient, useTestNet)) {
    errors.recipient = new InvalidAddress();
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
