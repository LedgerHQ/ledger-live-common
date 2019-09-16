// @flow
import { BigNumber } from "bignumber.js";
import { scanAccountsOnDevice } from "../../../libcore/scanAccountsOnDevice";
import { validateRecipient } from "../../../bridge/shared";
import type { AccountBridge, CurrencyBridge } from "../../../types/bridge";
import type { Transaction } from "../types";
import { syncAccount } from "../../../libcore/syncAccount";
import libcoreSignAndBroadcast from "../../../libcore/signAndBroadcast";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import { FeeNotLoaded, NotEnoughBalance } from "@ledgerhq/errors";

const startSync = (initialAccount, _observation) => syncAccount(initialAccount);

const createTransaction = () => ({
  family: "tezos",
  amount: BigNumber(0),
  recipient: "",
  networkInfo: null
});

const signAndBroadcast = (account, transaction, deviceId) =>
  libcoreSignAndBroadcast({
    account,
    transaction,
    deviceId
  });

const getTransactionStatus = async (a, t) => {
  const estimatedFees = BigNumber(0);

  const totalSpent = !t.useAllAmount ? t.amount.plus(estimatedFees) : a.balance;

  const amount = t.useAllAmount ? a.balance.minus(estimatedFees) : t.amount;

  const showFeeWarning = amount.gt(0) && estimatedFees.times(10).gt(amount);

  // Fill up transaction errors...
  let transactionError;
  if (!t.fee) {
    transactionError = new FeeNotLoaded();
  } else if (totalSpent.gt(a.balance)) {
    transactionError = new NotEnoughBalance();
  }

  // Fill up recipient errors...

  const { recipientError, recipientWarning } = await validateRecipient(
    a.currency,
    t.recipient
  );

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
  return t;
};

const fillUpExtraFieldToApplyTransactionNetworkInfo = (
  _a,
  _t,
  _networkInfo
) => ({});

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice
};

const getCapabilities = () => ({
  canSync: true,
  canSend: true
});

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  prepareTransaction,
  getTransactionStatus,
  startSync,
  signAndBroadcast,
  getCapabilities,
  ...inferDeprecatedMethods({
    name: "LibcoreTezosAccountBridge",
    createTransaction,
    getTransactionStatus,
    prepareTransaction,
    fillUpExtraFieldToApplyTransactionNetworkInfo
  })
};

export default { currencyBridge, accountBridge };
