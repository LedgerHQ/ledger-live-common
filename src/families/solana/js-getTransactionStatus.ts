import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  FeeNotLoaded,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  RecipientRequired,
  AmountRequired,
  FeeTooHigh,
  NotEnoughBalanceInParentAccount,
} from "@ledgerhq/errors";
import type { Account, TokenAccount } from "../../types";
import type { Transaction } from "./types";
import {
  isAccountNotFunded,
  isValidBase58Address,
  isEd25519Address,
  MAX_MEMO_LENGTH,
  decodeAccountIdWithTokenAccountAddress,
} from "./logic";
import {
  SolanaAccountNotFunded,
  SolanaAddressOffEd25519,
  SolanaAssociatedTokenAccountNotFunded,
  SolanaMemoIsTooLong,
} from "./errors";
import { findAssociatedTokenAddress, getAccount } from "./api";

const getTransactionStatus = async (
  mainAccount: Account,
  t: Transaction
): Promise<Status> => {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};
  const useAllAmount = !!t.useAllAmount;

  if (t.fees === undefined || t.fees.lt(0)) {
    errors.fees = new FeeNotLoaded();
  }

  const fees = t.fees ?? new BigNumber(0);

  if (!useAllAmount && t.amount.lte(0)) {
    errors.amount = new AmountRequired();
  }

  if (!errors.fees && mainAccount.balance.lte(fees)) {
    errors.amount = new NotEnoughBalance();
  }

  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (mainAccount.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else if (!isValidBase58Address(t.recipient)) {
    errors.recipient = new InvalidAddress();
  } else if (!isEd25519Address(t.recipient)) {
    errors.recipient = new SolanaAddressOffEd25519();
  } else if (await isAccountNotFunded(t.recipient)) {
    warnings.recipient = new SolanaAccountNotFunded();
  }

  if (t.memo && t.memo.length > MAX_MEMO_LENGTH) {
    errors.memo = errors.memo = new SolanaMemoIsTooLong(undefined, {
      maxLength: MAX_MEMO_LENGTH,
    });
  }

  const currentStatus: Partial<Status> = {
    errors,
    warnings,
    estimatedFees: fees,
  };

  const status: Status = t.subAccountId
    ? await getTokenTransactionStatus(
        mainAccount,
        t.subAccountId,
        t,
        currentStatus
      )
    : getNativeTransactionStatus(mainAccount, t, currentStatus);

  return status;
};

type Status = {
  errors: Record<string, Error>;
  warnings: Record<string, Error>;
  estimatedFees: BigNumber;
  amount: BigNumber;
  totalSpent: BigNumber;
};

async function getTokenTransactionStatus(
  mainAccount: Account,
  subAccountId: string,
  t: Transaction,
  currentStatus: Partial<Status>
): Promise<Status> {
  const errors: Record<string, Error> = { ...(currentStatus.errors ?? {}) };
  const warnings: Record<string, Error> = { ...(currentStatus.warnings ?? {}) };
  const estimatedFees = currentStatus.estimatedFees ?? new BigNumber(0);

  const account = mainAccount.subAccounts?.find(
    (acc) => acc.id === subAccountId
  );

  if (!account || account.type !== "TokenAccount") {
    throw new Error("sub account not found");
  }
  // t.recipient is token acc or main?
  // check if recipient is a token account

  //getAccount

  /*
  const associatedTokenAccAddress = await findAssociatedTokenAddress(
    mainAccount.freshAddress,
    account.token.id
  );
  */

  /*
  if (await isAccountNotFunded(tokenAccAddress)) {
    warnings.recipient = new SolanaAssociatedTokenAccountNotFunded();
    // TODO: ui to allow to create it and notify the fee increased
      if (t.mode.fundRecipient) {
        warnings.recipient = new SolanaAssociatedTokenAccountNotFunded();
      } else {
        errors.recipient = new SolanaAssociatedTokenAccountNotFunded();
      }
  }
  */

  const amount = t.useAllAmount ? account.balance : t.amount;
  const totalSpent = amount;

  if (!errors.amount && totalSpent.gt(account.balance)) {
    errors.amount = new NotEnoughBalance();
  }

  return {
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  };
}

function getNativeTransactionStatus(
  account: Account,
  t: Transaction,
  currentStatus: Partial<Status>
): Status {
  const errors: Record<string, Error> = { ...(currentStatus.errors ?? {}) };
  const warnings: Record<string, Error> = { ...(currentStatus.warnings ?? {}) };
  const estimatedFees = currentStatus.estimatedFees ?? new BigNumber(0);

  const amount = t.useAllAmount
    ? account.balance.minus(estimatedFees)
    : t.amount;

  const totalSpent = amount.plus(estimatedFees);

  if (!errors.amount && totalSpent.gt(account.balance)) {
    errors.amount = new NotEnoughBalance();
  } else if (!errors.fees && estimatedFees.gte(amount.times(10))) {
    errors.fees = new FeeTooHigh();
  }

  return {
    errors,
    warnings,
    amount,
    estimatedFees,
    totalSpent,
  };
}

export default getTransactionStatus;
