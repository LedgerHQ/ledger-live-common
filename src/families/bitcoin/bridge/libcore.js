// @flow
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import { FeeNotLoaded, FeeRequired } from "@ledgerhq/errors";
import { validateRecipient } from "../../../bridge/shared";
import type { AccountBridge, CurrencyBridge } from "../../../types/bridge";
import type { Account } from "../../../types/account";
import type { Transaction } from "../types";
import { syncAccount } from "../../../libcore/syncAccount";
import { scanAccountsOnDevice } from "../../../libcore/scanAccountsOnDevice";
import { getAccountNetworkInfo } from "../../../libcore/getAccountNetworkInfo";
import { getFeesForTransaction } from "../../../libcore/getFeesForTransaction";
import libcoreSignAndBroadcast from "../../../libcore/signAndBroadcast";
import { makeLRUCache } from "../../../cache";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";

const startSync = (initialAccount, _observation) => syncAccount(initialAccount);

const calculateFees = makeLRUCache(
  async (a, t) => {
    const { recipientError } = await validateRecipient(a.currency, t.recipient);
    if (recipientError) throw recipientError;
    return getFeesForTransaction({
      account: a,
      transaction: t
    });
  },
  (a, t) =>
    `${a.id}_${a.blockHeight || 0}_${t.amount.toString()}_${t.recipient}_${
      t.feePerByte ? t.feePerByte.toString() : ""
    }`
);

const createTransaction = () => ({
  family: "bitcoin",
  amount: BigNumber(0),
  recipient: "",
  feePerByte: null,
  networkInfo: null,
  useAllAmount: false
});

const signAndBroadcast = (account, transaction, deviceId) =>
  libcoreSignAndBroadcast({
    account,
    transaction,
    deviceId
  });

const getTransactionStatus = async (a, t) => {
  const useAllAmount = !!t.useAllAmount;

  let feesResult;
  if (!t.feePerByte) {
    feesResult = {
      transactionError: new FeeNotLoaded(),
      estimatedFees: BigNumber(0)
    };
  } else if (t.feePerByte.eq(0)) {
    feesResult = {
      transactionError: new FeeRequired(),
      estimatedFees: BigNumber(0)
    };
  } else {
    feesResult = await calculateFees(a, t).then(
      estimatedFees => ({ transactionError: null, estimatedFees }),
      transactionError => ({ transactionError, estimatedFees: BigNumber(0) })
    );
  }
  const { estimatedFees, transactionError } = feesResult;

  const totalSpent = useAllAmount
    ? a.balance
    : BigNumber(t.amount || 0).plus(estimatedFees);

  const amount = useAllAmount
    ? a.balance.minus(estimatedFees)
    : BigNumber(t.amount || 0);

  const showFeeWarning = amount.gt(0) && estimatedFees.times(10).gt(amount);

  // Fill up recipient errors...

  let { recipientError, recipientWarning } = await validateRecipient(
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
    useAllAmount
  });
};

const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => {
  if (t.networkInfo) return t;
  const networkInfo = await getAccountNetworkInfo(a);
  invariant(networkInfo.family === "bitcoin", "bitcoin networkInfo expected");
  const feePerByte = t.feePerByte || networkInfo.feeItems.defaultFeePerByte;
  if (feePerByte === t.feePerByte || feePerByte.eq(t.feePerByte || 0)) {
    return t;
  }
  return {
    ...t,
    networkInfo,
    feePerByte
  };
};

const fillUpExtraFieldToApplyTransactionNetworkInfo = (a, t, networkInfo) => ({
  feePerByte: t.feePerByte || networkInfo.feeItems.defaultFeePerByte
});

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  prepareTransaction,
  getTransactionStatus,
  startSync,
  signAndBroadcast,
  ...inferDeprecatedMethods({
    name: "LibcoreBitcoinAccountBridge",
    createTransaction,
    getTransactionStatus,
    prepareTransaction,
    fillUpExtraFieldToApplyTransactionNetworkInfo
  })
};

export default { currencyBridge, accountBridge };
