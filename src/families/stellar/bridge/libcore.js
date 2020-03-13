// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import {
  AmountRequired,
  NotEnoughBalance,
  FeeNotLoaded,
  InvalidAddressBecauseDestinationIsAlsoSource
} from "@ledgerhq/errors";
import {
  StellarWrongMemoFormat,
  StellarMinimumBalanceWarning,
  StellarNewAccountMinimumTransaction,
  StellarSourceHasMultiSign
} from "../../../errors";
import { validateRecipient } from "../../../bridge/shared";
import type { AccountBridge, CurrencyBridge } from "../../../types";
import type { Transaction } from "../types";
import { scanAccounts } from "../../../libcore/scanAccounts";
import { getAccountNetworkInfo } from "../../../libcore/getAccountNetworkInfo";
import { sync } from "../../../libcore/syncAccount";
import broadcast from "../libcore-broadcast";
import signOperation from "../libcore-signOperation";
import { withLibcore } from "../../../libcore/access";
import memoTypeCheck from "../memo-type-check";

import { getWalletName } from "../../../account";
import { getOrCreateWallet } from "../../../libcore/getOrCreateWallet";
import { getCoreAccount } from "../../../libcore/getCoreAccount";

const checkRecipientExist = (account, recipient) =>
  withLibcore(async core => {
    const { derivationMode, currency } = account;

    const walletName = getWalletName(account);

    const coreWallet = await getOrCreateWallet({
      core,
      walletName,
      currency,
      derivationMode
    });

    const stellarLikeWallet = await coreWallet.asStellarLikeWallet();
    const recipientExist = await stellarLikeWallet.exists(recipient);

    return recipientExist;
  });

const createTransaction = () => ({
  family: "stellar",
  amount: BigNumber(0),
  baseReserve: null,
  networkInfo: null,
  fees: null,
  recipient: "",
  memoValue: null,
  memoType: null,
  useAllAmount: false,
  memoTypeRecommended: null
});

const updateTransaction = (t, patch) => {
  if ("recipient" in patch && patch.recipient !== t.recipient) {
    return { ...t, ...patch, memoType: null };
  }
  return { ...t, ...patch };
};

const isMemoValide = (memoType: string, memoValue: string): boolean => {
  switch (memoType) {
    case "MEMO_TEXT":
      if (memoValue.length > 28) {
        return false;
      }
      break;

    case "MEMO_ID":
      if (BigNumber(memoValue.toString()).isNaN()) {
        return false;
      }
      break;

    case "MEMO_HASH":
    case "MEMO_RETURN":
      if (!memoValue.length || memoValue.length !== 32) {
        return false;
      }
      break;
  }
  return true;
};

const isAccountIsMultiSign = async account =>
  withLibcore(async core => {
    const { coreAccount } = await getCoreAccount(core, account);

    const stellarLikeAccount = await coreAccount.asStellarLikeAccount();
    const signers = await stellarLikeAccount.getSigners();

    return signers.length > 1;
  });

const getTransactionStatus = async (a, t) => {
  const errors = {};
  const warnings = {};
  const useAllAmount = !!t.useAllAmount;

  if (a.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else {
    const { recipientError, recipientWarning } = await validateRecipient(
      a.currency,
      t.recipient
    );

    if (recipientError) {
      errors.recipient = recipientError;
    }

    if (recipientWarning) {
      warnings.recipient = recipientWarning;
    }
  }

  if (await isAccountIsMultiSign(a)) {
    errors.recipient = new StellarSourceHasMultiSign();
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

  if (useAllAmount) {
    warnings.amount = new StellarMinimumBalanceWarning();
  }

  if (
    !errors.amount &&
    amount
      .plus(estimatedFees)
      .plus(baseReserve)
      .gt(a.balance)
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

  // if amount < 1.0 you can't
  if (
    !errors.amount &&
    !(await checkRecipientExist(a, t.recipient)) &&
    amount.lt(10000000)
  ) {
    errors.amount = new StellarNewAccountMinimumTransaction();
  }

  if (t.memoType && t.memoValue && isMemoValide(t.memoType, t.memoValue)) {
    errors.transaction = new StellarWrongMemoFormat();
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent
  });
};

const prepareTransaction = async (a, t) => {
  const networkInfo = t.networkInfo || (await getAccountNetworkInfo(a));
  invariant(networkInfo.family === "stellar", "stellar networkInfo expected");

  const fees = t.fees || networkInfo.fees;
  const baseReserve = t.baseReserve || networkInfo.baseReserve;

  const getMemoData = async () => {
    if (t.memoType) {
      return {
        memoType: t.memoType,
        memoTypeRecommended: t.memoTypeRecommended
      };
    } else {
      const { recipientError } = await validateRecipient(
        a.currency,
        t.recipient
      );
      if (!recipientError) {
        const memoType = await memoTypeCheck(t.recipient);
        const memoTypeRecommended = memoType !== null ? true : false;
        return { memoType, memoTypeRecommended };
      }
      return {
        memoType: undefined,
        memoTypeRecommended: t.memoTypeRecommended
      };
    }
  };

  const { memoType, memoTypeRecommended } = await getMemoData();

  if (
    t.networkInfo !== networkInfo ||
    t.fees !== fees ||
    t.baseReserve !== baseReserve ||
    t.memoType !== memoType
  ) {
    return {
      ...t,
      networkInfo,
      fees,
      baseReserve,
      memoType,
      memoTypeRecommended
    };
  }

  return t;
};

const preload = async () => {};

const hydrate = () => {};

const currencyBridge: CurrencyBridge = {
  preload,
  hydrate,
  scanAccounts
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  sync,
  signOperation,
  broadcast
};

export default { currencyBridge, accountBridge };
