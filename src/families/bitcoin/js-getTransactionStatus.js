// @flow
import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import {
  AmountRequired,
  NotEnoughBalance,
  FeeNotLoaded,
  FeeTooHigh,
  FeeRequired,
} from "@ledgerhq/errors";
import { LowerThanMinimumRelayFee } from "./../../errors";
import type { Account } from "./../../types";
import type { Transaction } from "./types";
import { calculateFees, validateRecipient } from "./cache";
import { getMinRelayFee } from "./logic";

// TODO Test all cases

const getTransactionStatus = async (a: Account, t: Transaction) => {
  console.log("XXX - getTransactionStatus - START");

  const errors = {};
  const warnings = {};
  const useAllAmount = !!t.useAllAmount;

  let { recipientError, recipientWarning } = await validateRecipient({
    currency: a.currency,
    recipient: t.recipient,
  });

  if (recipientError) {
    errors.recipient = recipientError;
  }

  if (recipientWarning) {
    warnings.recipient = recipientWarning;
  }

  let txInputs;
  let txOutputs;
  let estimatedFees = BigNumber(0);
  if (!t.feePerByte) {
    errors.feePerByte = new FeeNotLoaded();
  } else if (t.feePerByte.eq(0)) {
    errors.feePerByte = new FeeRequired();
  } else if (!errors.recipient) {
    await calculateFees({ account: a, transaction: t }).then(
      (res) => {
        txInputs = res.txInputs;
        txOutputs = res.txOutputs;
        estimatedFees = res.fees;
      },
      (error) => {
        if (error.name === "NotEnoughBalance") {
          errors.amount = error;
        } else {
          throw error;
        }
      }
    );
  }

  const sumOfInputs = (txInputs || []).reduce(
    (sum, input) => sum.plus(input.value),
    BigNumber(0)
  );
  const sumOfChanges = (txOutputs || [])
    .filter((o) => o.isChange)
    .reduce((sum, output) => sum.plus(output.value), BigNumber(0));

  if (txInputs) {
    log("bitcoin", `${txInputs.length} inputs, sum: ${sumOfInputs.toString()}`);
  }

  if (txOutputs) {
    log(
      "bitcoin",
      `${txOutputs.length} outputs, sum of changes: ${sumOfChanges.toString()}`
    );
  }

  // TODO Make sure minimum spendable is handled (dust)
  const totalSpent = sumOfInputs.minus(sumOfChanges);
  const amount = useAllAmount ? totalSpent.minus(estimatedFees) : t.amount;

  log(
    "bitcoin",
    `totalSpent ${totalSpent.toString()} amount ${amount.toString()}`
  );

  if (!errors.amount && !amount.gt(0)) {
    errors.amount = useAllAmount
      ? new NotEnoughBalance()
      : new AmountRequired();
  }

  if (
    process.env.EXPERIMENTAL_MIN_RELAY_FEE &&
    estimatedFees.gt(0) &&
    estimatedFees.lt(getMinRelayFee(a.currency))
  ) {
    warnings.feePerByte = new LowerThanMinimumRelayFee();
  } else if (amount.gt(0) && estimatedFees.times(10).gt(amount)) {
    warnings.feeTooHigh = new FeeTooHigh();
  }

  console.log("XXX - getTransactionStatus - END");
  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
    txInputs,
    txOutputs,
  });
};

export default getTransactionStatus;
