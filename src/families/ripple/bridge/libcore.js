// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { scanAccountsOnDevice } from "../../../libcore/scanAccountsOnDevice";
import { validateRecipient } from "../../../bridge/shared";
import type { AccountBridge, CurrencyBridge } from "../../../types/bridge";
import type { Transaction } from "../types";
import { syncAccount } from "../../../libcore/syncAccount";
import libcoreSignAndBroadcast from "../../../libcore/signAndBroadcast";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import { getAccountNetworkInfo } from "../../../libcore/getAccountNetworkInfo";
import {
  FeeNotLoaded,
  FeeRequired,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance
} from "@ledgerhq/errors";

const startSync = (initialAccount, _observation) => syncAccount(initialAccount);

const createTransaction = () => ({
  family: "ripple",
  amount: BigNumber(0),
  recipient: "",
  tag: null,
  fee: null,
  feeCustomUnit: null,
  networkInfo: null
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const signAndBroadcast = (account, transaction, deviceId) =>
  libcoreSignAndBroadcast({
    account,
    transaction,
    deviceId
  });

const getTransactionStatus = async (a, t) => {
  const baseReserve = t.networkInfo ? t.networkInfo.baseReserve : BigNumber(0);

  const estimatedFees = t.fee || BigNumber(0);

  const totalSpent = !t.useAllAmount
    ? t.amount.plus(estimatedFees)
    : a.balance.minus(baseReserve);

  const amount = t.useAllAmount ? a.balance.minus(estimatedFees) : t.amount;

  const showFeeWarning = amount.gt(0) && estimatedFees.times(10).gt(amount);

  // Fill up transaction errors...
  let transactionError;
  if (!t.fee) {
    transactionError = new FeeNotLoaded();
  } else if (t.fee.eq(0)) {
    transactionError = new FeeRequired();
  } else if (totalSpent.gt(a.balance.minus(baseReserve))) {
    transactionError = new NotEnoughBalance();
  }
  // TODO take care of account not created ; NotEnoughBalanceBecauseDestinationNotCreated

  // Fill up recipient errors...
  let recipientError;
  let recipientWarning = null;

  if (a.freshAddress === t.recipient) {
    recipientError = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else {
    const result = await validateRecipient(a.currency, t.recipient);

    recipientError = result.recipientError;
    recipientWarning = result.recipientWarning;
  }

  return Promise.resolve({
    transactionError,
    recipientError,
    recipientWarning,
    showFeeWarning,
    estimatedFees,
    amount,
    totalSpent,
    useAllAmount: !!t.useAllAmount
  });
};

const prepareTransaction = async (a, t) => {
  let networkInfo = t.networkInfo;
  if (!networkInfo) {
    const r = await getAccountNetworkInfo(a);
    invariant(r.family === "ripple", "ripple getAccountNetworkInfo expected");
    networkInfo = r;
  }

  const fee = t.fee || networkInfo.serverFee;
  if (networkInfo && (fee === t.fee || fee.eq(t.fee || 0))) {
    // nothing changes
    return t;
  }

  return {
    ...t,
    networkInfo,
    fee
  };
};

// FIXME totally assuming this :shrug:
const fillUpExtraFieldToApplyTransactionNetworkInfo = (a, t, networkInfo) => ({
  serverFee: networkInfo.serverFee ? BigNumber(networkInfo.serverFee) : null,
  unit: networkInfo.unit
});

const getCapabilities = () => ({
  canSync: true,
  canSend: true
});

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  startSync,
  signAndBroadcast,
  getCapabilities,
  ...inferDeprecatedMethods({
    name: "LibcoreRippleAccountBridge",
    createTransaction,
    getTransactionStatus,
    prepareTransaction,
    fillUpExtraFieldToApplyTransactionNetworkInfo
  })
};

export default { currencyBridge, accountBridge };
