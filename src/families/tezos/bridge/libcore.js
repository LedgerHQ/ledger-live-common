// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { FeeNotLoaded } from "@ledgerhq/errors";
import { validateRecipient } from "../../../bridge/shared";
import type { Account, AccountBridge, CurrencyBridge } from "../../../types";
import type { Transaction } from "../types";
import { tezosOperationTag } from "../types";
import { scanAccountsOnDevice } from "../../../libcore/scanAccountsOnDevice";
import { getAccountNetworkInfo } from "../../../libcore/getAccountNetworkInfo";
import { syncAccount } from "../../../libcore/syncAccount";
import { getFeesForTransaction } from "../../../libcore/getFeesForTransaction";
import libcoreSignAndBroadcast from "../../../libcore/signAndBroadcast";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import { makeLRUCache } from "../../../cache";
import { withLibcore } from "../../../libcore/access";
import { libcoreBigIntToBigNumber } from "../../../libcore/buildBigNumber";
import { getCoreAccount } from "../../../libcore/getCoreAccount";

type EstimateGasLimitAndStorage = (
  Account,
  string
) => Promise<{ gasLimit: BigNumber, storage: BigNumber }>;
export const estimateGasLimitAndStorage: EstimateGasLimitAndStorage = makeLRUCache(
  (account, addr) =>
    withLibcore(async core => {
      const { coreAccount } = await getCoreAccount(core, account);
      const tezosLikeAccount = await coreAccount.asTezosLikeAccount();
      const gasLimit = await libcoreBigIntToBigNumber(
        await tezosLikeAccount.getEstimatedGasLimit(addr)
      );
      const storage = await libcoreBigIntToBigNumber(
        await tezosLikeAccount.getStorage(addr)
      );
      return { gasLimit, storage };
    }),
  (a, addr) => a.id + "|" + addr
);

type GetStorage = (Account, string) => Promise<BigNumber>;
export const getStorage: GetStorage = makeLRUCache(
  (account, addr) =>
    withLibcore(async core => {
      const { coreAccount } = await getCoreAccount(core, account);
      const tezosLikeAccount = await coreAccount.asTezosLikeAccount();
      const r = await tezosLikeAccount.getStorage(addr);
      const bn = await libcoreBigIntToBigNumber(r);
      return bn;
    }),
  (a, addr) => a.id + "|" + addr
);

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
    `${a.id}_${t.amount.toString()}_${t.recipient}_${
      t.gasLimit ? t.gasLimit.toString() : ""
    }_${t.fees ? t.fees.toString() : ""}_${
      t.storageLimit ? t.storageLimit.toString() : ""
    }`
);

const startSync = (initialAccount, _observation) => syncAccount(initialAccount);

const createTransaction = () => ({
  family: "tezos",
  type: tezosOperationTag.OPERATION_TAG_TRANSACTION,
  amount: BigNumber(0),
  fees: null,
  gasLimit: null,
  storageLimit: null,
  recipient: "",
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
  const subAcc = !t.subAccountId
    ? null
    : a.subAccounts && a.subAccounts.find(ta => ta.id === t.subAccountId);
  const account = subAcc || a;

  let feesResult;
  if (!t.fees) {
    feesResult = {
      transactionError: new FeeNotLoaded(),
      estimatedFees: BigNumber(0)
    };
  } else {
    feesResult = await calculateFees(a, t).then(
      estimatedFees => ({ transactionError: null, estimatedFees }),
      transactionError => ({ transactionError, estimatedFees: BigNumber(0) })
    );
  }
  const { estimatedFees, transactionError } = feesResult;

  const totalSpent = !t.useAllAmount
    ? t.amount.plus(estimatedFees)
    : account.balance;

  const amount = t.useAllAmount
    ? account.balance.minus(estimatedFees)
    : t.amount;

  const showFeeWarning = amount.gt(0) && estimatedFees.times(10).gt(amount);

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
    useAllAmount: !!t.useAllAmount,
    recipientIsReadOnly: !!t.subAccountId
  });
};

const prepareTransaction = async (a, t) => {
  let networkInfo = t.networkInfo;
  if (!networkInfo) {
    const ni = await getAccountNetworkInfo(a);
    invariant(ni.family === "tezos", "tezos networkInfo expected");
    networkInfo = ni;
  }

  let gasLimit = t.gasLimit;
  let storageLimit = t.storageLimit;
  if (!gasLimit && t.recipient) {
    const { recipientError } = await validateRecipient(a.currency, t.recipient);
    if (!recipientError) {
      const r = await estimateGasLimitAndStorage(a, t.recipient);
      gasLimit = r.gasLimit;
      storageLimit = r.storage;
    }
  }

  let fees = t.fees || networkInfo.fees;

  // FIXME force sending to parent?
  /*
  let recipient = t.recipient;
  if (t.subAccountId && !t.recipient) {
    recipient = a.freshAddress;
  }
  */

  if (
    t.networkInfo !== networkInfo ||
    t.gasLimit !== gasLimit ||
    t.storageLimit !== storageLimit ||
    t.fees !== fees ||
    t.recipient !== recipient
  ) {
    return { ...t, networkInfo, storageLimit, gasLimit, fees, recipient };
  }

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
  updateTransaction,
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
