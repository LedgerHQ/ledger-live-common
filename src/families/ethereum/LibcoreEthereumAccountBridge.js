// @flow
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import {
  FeeNotLoaded,
  InvalidAddressBecauseDestinationIsAlsoSource
} from "@ledgerhq/errors";
import type { TokenAccount, Account } from "../../types";
import type { AccountBridge } from "../../types/bridge";
import { getAccountNetworkInfo } from "../../libcore/getAccountNetworkInfo";
import { syncAccount } from "../../libcore/syncAccount";
import { getFeesForTransaction } from "../../libcore/getFeesForTransaction";
import libcoreSignAndBroadcast from "../../libcore/signAndBroadcast";
import { makeLRUCache } from "../../cache";
import { apiForCurrency } from "../../api/Ethereum";
import { inferDeprecatedMethods } from "../../bridge/deprecationUtils";
import { validateRecipient } from "../../bridge/shared";
import type { Transaction } from "./types";

const getTransactionAccount = (a, t): Account | TokenAccount => {
  const { tokenAccountId } = t;
  return tokenAccountId
    ? (a.tokenAccounts || []).find(ta => ta.id === tokenAccountId) || a
    : a;
};

const startSync = (initialAccount, _observation) => syncAccount(initialAccount);

const defaultGasLimit = BigNumber(0x5208);

const createTransaction = a => ({
  family: "ethereum",
  amount: BigNumber(0),
  recipient: "",
  gasPrice: null,
  gasLimit: defaultGasLimit,
  networkInfo: null,
  feeCustomUnit: a.currency.units[1] || a.currency.units[0],
  useAllAmount: false
});

const signAndBroadcast = (account, transaction, deviceId) =>
  libcoreSignAndBroadcast({
    account,
    transaction,
    deviceId
  });

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
      t.gasLimit ? t.gasLimit.toString() : ""
    }_${t.gasPrice ? t.gasPrice.toString() : ""}`
);

const getTransactionStatus = async (a, t) => {
  const tokenAccount = !t.tokenAccountId
    ? null
    : a.tokenAccounts && a.tokenAccounts.find(ta => ta.id === t.tokenAccountId);
  const account = tokenAccount || a;

  const useAllAmount = !!t.useAllAmount;

  let feesResult;
  if (!t.gasPrice) {
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

  const totalSpent = useAllAmount
    ? account.balance
    : tokenAccount
    ? BigNumber(t.amount || 0)
    : BigNumber(t.amount || 0).plus(estimatedFees);

  const amount = useAllAmount
    ? tokenAccount
      ? BigNumber(t.amount || 0)
      : account.balance.minus(estimatedFees)
    : BigNumber(t.amount || 0);

  const showFeeWarning = tokenAccount
    ? false
    : amount.gt(0) && estimatedFees.times(10).gt(amount);

  // Fill up recipient errors...

  let { recipientError, recipientWarning } = await validateRecipient(
    a.currency,
    t.recipient
  );
  if (tokenAccount && a.freshAddress === t.recipient) {
    recipientError = new InvalidAddressBecauseDestinationIsAlsoSource();
  }

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

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> => {
  const api = apiForCurrency(a.currency);
  const tAccount = getTransactionAccount(a, t);
  let networkInfo = t.networkInfo;
  if (!networkInfo) {
    const ni = await getAccountNetworkInfo(a);
    invariant(ni.family === "ethereum", "bitcoin networkInfo expected");
    networkInfo = ni;
  }

  const gasLimit =
    // TODO uses new getFees function!
    tAccount.type === "TokenAccount"
      ? BigNumber(
          await api.estimateGasLimitForERC20(tAccount.token.contractAddress)
        )
      : t.recipient
      ? BigNumber(await api.estimateGasLimitForERC20(t.recipient))
      : defaultGasLimit;

  const gasPrice =
    t.gasPrice ||
    (networkInfo.gasPrice ? BigNumber(networkInfo.gasPrice) : null);
  if (
    gasLimit.eq(t.gasLimit) &&
    t.networkInfo === networkInfo &&
    (gasPrice === t.gasPrice ||
      (gasPrice && t.gasPrice && gasPrice.eq(t.gasPrice)))
  ) {
    return t;
  }
  return {
    ...t,
    networkInfo,
    gasLimit,
    gasPrice
  };
};

const fillUpExtraFieldToApplyTransactionNetworkInfo = (a, t, networkInfo) => ({
  gasPrice:
    t.gasPrice ||
    (networkInfo.gas_price ? BigNumber(networkInfo.gas_price) : null)
});

const bridge: AccountBridge<Transaction> = {
  createTransaction,
  prepareTransaction,
  getTransactionStatus,
  startSync,
  signAndBroadcast,
  ...inferDeprecatedMethods({
    name: "LibcoreEthereumAccountBridge",
    createTransaction,
    getTransactionStatus,
    prepareTransaction,
    fillUpExtraFieldToApplyTransactionNetworkInfo
  })
};

export default bridge;
