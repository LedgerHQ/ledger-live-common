import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  FeeNotLoaded,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  RecipientRequired,
  AmountRequired,
  FeeTooHigh,
} from "@ledgerhq/errors";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import {
  isAccountNotFunded,
  isValidBase58Address,
  isEd25519Address,
  MAX_MEMO_LENGTH,
} from "./logic";
import {
  SolanaAccountNotFunded,
  SolanaAddressOffEd25519,
  SolanaMemoIsTooLong,
} from "./errors";

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

  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (a.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else if (!isValidBase58Address(t.recipient)) {
    errors.recipient = new InvalidAddress();
  } else if (!isEd25519Address(t.recipient)) {
    errors.recipient = new SolanaAddressOffEd25519();
  } else if (await isAccountNotFunded(t.recipient)) {
    const error = new SolanaAccountNotFunded();
    if (t.allowUnFundedRecipient) {
      warnings.recipient = error;
    } else {
      errors.recipient = error;
    }
  }

  if (t.memo && t.memo.length > MAX_MEMO_LENGTH) {
    errors.memo = errors.memo = new SolanaMemoIsTooLong(undefined, {
      maxLength: MAX_MEMO_LENGTH,
    });
  }

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
