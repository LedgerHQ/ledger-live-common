// @flow
import { BigNumber } from "bignumber.js";
import {
  AmountRequired,
  NotEnoughBalance,
  FeeNotLoaded,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughSpendableBalance,
  NotEnoughBalanceBecauseDestinationNotCreated,
} from "@ledgerhq/errors";
import {
  StellarWrongMemoFormat,
  SourceHasMultiSign,
  AccountAwaitingSendPendingOperations,
} from "../../errors";
import { formatCurrencyUnit } from "../../currencies";
import type { Account } from "../../types";
import {
  isAddressValid,
  checkRecipientExist,
  isAccountMultiSign,
} from "./logic";

const getTransactionStatus = async (a: Account, t) => {
  const errors = {};
  const warnings = {};
  const useAllAmount = !!t.useAllAmount;

  if (a.pendingOperations.length > 0) {
    throw new AccountAwaitingSendPendingOperations();
  }

  if (a.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else if (!isAddressValid(t.recipient)) {
    errors.recipient = new InvalidAddress("");
  }

  if (await isAccountMultiSign(a)) {
    errors.recipient = new SourceHasMultiSign("", {
      currencyName: a.currency.name,
    });
  }

  if (!t.fees || !t.baseReserve) {
    errors.fees = new FeeNotLoaded();
  }

  let estimatedFees = !t.fees ? BigNumber(0) : t.fees;
  let baseReserve = !t.baseReserve ? BigNumber(0) : t.baseReserve;

  let amount = !useAllAmount
    ? t.amount
    : a.balance.minus(baseReserve).minus(estimatedFees);
  let totalSpent = !useAllAmount
    ? amount.plus(estimatedFees)
    : a.balance.minus(baseReserve);

  if (totalSpent.gt(a.balance.minus(baseReserve))) {
    errors.amount = new NotEnoughSpendableBalance(null, {
      minimumAmount: formatCurrencyUnit(a.currency.units[0], baseReserve, {
        disableRounding: true,
        useGrouping: false,
        showCode: true,
      }),
    });
  }

  if (
    !errors.amount &&
    amount.plus(estimatedFees).plus(baseReserve).gt(a.balance)
  ) {
    errors.amount = new NotEnoughBalance();
  }

  if (
    !errors.recipient &&
    !errors.amount &&
    (amount.lt(0) || totalSpent.gt(a.balance))
  ) {
    errors.amount = new NotEnoughBalance();
    totalSpent = BigNumber(0);
    amount = BigNumber(0);
  }

  if (!errors.amount && amount.eq(0)) {
    errors.amount = new AmountRequired();
  }

  // if amount < 1.0 you can't send to an empty address
  if (
    t.recipient &&
    !errors.amount &&
    !(await checkRecipientExist({ account: a, recipient: t.recipient })) &&
    amount.lt(10000000)
  ) {
    errors.amount = new NotEnoughBalanceBecauseDestinationNotCreated("", {
      minimalAmount: "1 XLM",
    });
  }

  if (t.memoType && t.memoValue && !isMemoValid(t.memoType, t.memoValue)) {
    errors.transaction = new StellarWrongMemoFormat();
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
