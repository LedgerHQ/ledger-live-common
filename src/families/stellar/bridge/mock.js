// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import {
  AmountRequired,
  NotEnoughBalance,
  FeeNotLoaded,
  RecipientRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalanceBecauseDestinationNotCreated,
  NotEnoughSpendableBalance,
} from "@ledgerhq/errors";
import { StellarWrongMemoFormat, SourceHasMultiSign } from "../../../errors";
import type { AccountBridge, CurrencyBridge } from "../../../types";
import type { Transaction } from "../types";
import { getMainAccount } from "../../../account";
import { formatCurrencyUnit } from "../../../currencies";
import { makeAccountBridgeReceive } from "../../../bridge/mockHelpers";

const receive = makeAccountBridgeReceive();

import {
  scanAccounts,
  signOperation,
  broadcast,
  sync,
  isInvalidRecipient,
} from "../../../bridge/mockHelpers";

const notCreatedAddresses = [];
const multiSignAddresses = [];
const memotypeTextRecommendedAddresses = [];

export function addNotCreatedStellarMockAddresses(addr: string) {
  notCreatedAddresses.push(addr);
}
export function addMultisignStellarMockAddresses(addr: string) {
  multiSignAddresses.push(addr);
}
export function addMemotypeTextStellarMockAddresses(addr: string) {
  memotypeTextRecommendedAddresses.push(addr);
}

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
  memoTypeRecommended: null,
});

const updateTransaction = (t, patch) => {
  if ("recipient" in patch && patch.recipient !== t.recipient) {
    return { ...t, ...patch, memoType: null };
  }
  return { ...t, ...patch };
};

const isMemoValid = (memoType: string, memoValue: string): boolean => {
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

const getTransactionStatus = async (a, t) => {
  const errors = {};
  const warnings = {};
  const useAllAmount = !!t.useAllAmount;

  if (a.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else {
    if (!t.recipient) {
      errors.recipient = new RecipientRequired("");
    } else if (isInvalidRecipient(t.recipient)) {
      errors.recipient = new InvalidAddress("");
    }
  }

  if (multiSignAddresses.includes(a.freshAddress)) {
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

  // if amount < 1.0 you can't
  if (
    !errors.amount &&
    notCreatedAddresses.includes(t.recipient) &&
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

const prepareTransaction = async (a, t) => {
  const networkInfo = t.networkInfo || {
    family: "stellar",
    fees: BigNumber("100"),
    baseReserve: BigNumber("100000"),
  };
  invariant(networkInfo.family === "stellar", "stellar networkInfo expected");

  const fees = t.fees || networkInfo.fees;
  const baseReserve = t.baseReserve || networkInfo.baseReserve;

  const getMemoData = async () => {
    if (t.memoType) {
      return {
        memoType: t.memoType,
        memoTypeRecommended: t.memoTypeRecommended,
      };
    } else {
      if (!isInvalidRecipient(t.recipient)) {
        const memoType = memotypeTextRecommendedAddresses.includes(t.recipient)
          ? "MEMO_TEXT"
          : null;
        const memoTypeRecommended = memoType !== null ? true : false;
        return { memoType, memoTypeRecommended };
      }
      return {
        memoType: undefined,
        memoTypeRecommended: t.memoTypeRecommended,
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
      memoTypeRecommended,
    };
  }

  return t;
};

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const t = await prepareTransaction(mainAccount, {
    ...createTransaction(),
    recipient: notCreatedAddresses[0], // not used address
    ...transaction,
    useAllAmount: true,
  });
  const s = await getTransactionStatus(mainAccount, t);
  return s.amount;
};

const preload = async () => {};

const hydrate = () => {};

const currencyBridge: CurrencyBridge = {
  preload,
  hydrate,
  scanAccounts,
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  sync,
  receive,
  signOperation,
  broadcast,
  estimateMaxSpendable,
};

export default { currencyBridge, accountBridge };
