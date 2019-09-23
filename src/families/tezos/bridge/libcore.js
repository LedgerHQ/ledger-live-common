// @flow
import { BigNumber } from "bignumber.js";
import { FeeNotLoaded, NotEnoughBalance } from "@ledgerhq/errors";
import { scanAccountsOnDevice } from "../../../libcore/scanAccountsOnDevice";
import { validateRecipient } from "../../../bridge/shared";
import type { Account, AccountBridge, CurrencyBridge } from "../../../types";
import type { Transaction } from "../types";
import { tezosOperationTag } from "../types";
import { syncAccount } from "../../../libcore/syncAccount";
import libcoreSignAndBroadcast from "../../../libcore/signAndBroadcast";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import { makeLRUCache } from "../../../cache";
import { withLibcore } from "../../../libcore/access";
import { libcoreBigIntToBigNumber } from "../../../libcore/buildBigNumber";
import { getCoreAccount } from "../../../libcore/getCoreAccount";

type EstimateGasLimit = (Account, string) => Promise<BigNumber>;
export const estimateGasLimit: EstimateGasLimit = makeLRUCache(
  (account, addr) =>
    withLibcore(async core => {
      const { coreAccount } = await getCoreAccount(core, account);
      const tezosLikeAccount = await coreAccount.asTezosLikeAccount();
      const r = await tezosLikeAccount.getEstimatedGasLimit(addr);
      const bn = await libcoreBigIntToBigNumber(r);
      return bn;
    }),
  (a, addr) => a.id + "|" + addr
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
    useAllAmount: !!t.useAllAmount,
    recipientIsReadOnly: !!t.subAccountId
  });
};

const prepareTransaction = async (a, t) => {
  if (t.subAccountId && !t.recipient) {
    return { ...t, recipient: a.freshAddress };
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
