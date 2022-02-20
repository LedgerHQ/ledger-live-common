import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  RecipientRequired,
  FeeNotLoaded,
  InvalidAddress,
  AmountRequired,
} from "@ledgerhq/errors";
import type { Account, TransactionStatus } from "../../types";
import type { Transaction } from "./types";
import { isValidAddress } from "./logic";
import { utils as TyphonUtils } from "@stricahq/typhonjs";
import { getCurrentCardanoPreloadData } from "./preload";
import { CardanoMinAmountError } from "./errors";

const getTransactionStatus = async (
  a: Account,
  t: Transaction
): Promise<TransactionStatus> => {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};
  const useAllAmount = !!t.useAllAmount;

  const estimatedFees = t.fees || new BigNumber(0);
  const amount = t.amount;
  const totalSpent = new BigNumber(amount).plus(estimatedFees);
  const tokensToSend = []; //TODO: read from transaction

  const cardanoPreloadedData = getCurrentCardanoPreloadData();

  if (!t.fees) {
    errors.fees = new FeeNotLoaded();
  }

  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (!isValidAddress(t.recipient)) {
    errors.recipient = new InvalidAddress();
  }

  const minTransactionAmount = TyphonUtils.calculateMinUtxoAmount(
    tokensToSend,
    new BigNumber(cardanoPreloadedData.protocolParams.lovelacePerUtxoWord),
    false
  );

  if (!amount.gt(0)) {
    errors.amount = useAllAmount
      ? new NotEnoughBalance()
      : new AmountRequired();
  } else if (amount.lt(minTransactionAmount)) {
    errors.amount = new CardanoMinAmountError(
      `Minimum ${minTransactionAmount.div(1e6)} ADA required`
    );
  } else if (totalSpent.gt(a.balance)) {
    errors.amount = new NotEnoughBalance();
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
