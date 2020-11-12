// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import {
  NotEnoughGas,
  FeeNotLoaded,
  FeeRequired,
  GasLessThanEstimate,
} from "@ledgerhq/errors";
import type { CurrencyBridge, AccountBridge } from "../../../types";
import {
  makeSync,
  makeScanAccounts,
  makeAccountBridgeReceive,
} from "../../../bridge/jsHelpers";
import { getMainAccount } from "../../../account";
import { patchOperationWithHash } from "../../../operation";
import { getCryptoCurrencyById } from "../../../currencies";
import { apiForCurrency } from "../../../api/Ethereum";
import { getEstimatedFees } from "../../../api/Fees";
import type { Transaction } from "../types";
import {
  getGasLimit,
  inferEthereumGasLimitRequest,
  estimateGasLimit,
} from "../transaction";
import { getAccountShape } from "../synchronisation";
import { preload, hydrate } from "../modules";
import { signOperation } from "../signOperation";
import { modes } from "../modules";
import postSyncPatch from "../postSyncPatch";
import { inferDynamicRange } from "../../../range";

const receive = makeAccountBridgeReceive();

const broadcast = async ({
  account,
  signedOperation: { operation, signature },
}) => {
  const api = apiForCurrency(account.currency);
  const hash = await api.broadcastTransaction(signature);
  return patchOperationWithHash(operation, hash);
};

const scanAccounts = makeScanAccounts(getAccountShape);

const sync = makeSync(getAccountShape, postSyncPatch);

const createTransaction = () => ({
  family: "ethereum",
  mode: "send",
  amount: BigNumber(0),
  recipient: "",
  gasPrice: null,
  userGasLimit: null,
  estimatedGasLimit: null,
  networkInfo: null,
  feeCustomUnit: getCryptoCurrencyById("ethereum").units[1],
  useAllAmount: false,
});

const updateTransaction = (t, patch) => {
  if ("recipient" in patch && patch.recipient !== t.recipient) {
    return { ...t, ...patch, userGasLimit: null, estimatedGasLimit: null };
  }
  return { ...t, ...patch };
};

const getTransactionStatus = (a, t) => {
  const gasLimit = getGasLimit(t);
  const estimatedFees = (t.gasPrice || BigNumber(0)).times(gasLimit);

  const errors = {};
  const warnings = {};
  const result = {
    errors,
    warnings,
    estimatedFees,
    amount: BigNumber(0),
    totalSpent: BigNumber(0),
  };

  const m = modes[t.mode];
  invariant(m, "missing module for mode=" + t.mode);
  m.fillTransactionStatus(a, t, result);

  // generic gas error and warnings
  if (!t.gasPrice) {
    errors.gasPrice = new FeeNotLoaded();
  } else if (gasLimit.eq(0)) {
    errors.gasLimit = new FeeRequired();
  } else if (!errors.recipient) {
    if (estimatedFees.gt(a.balance)) {
      errors.gasPrice = new NotEnoughGas();
    }
  }

  if (t.estimatedGasLimit && gasLimit.lt(t.estimatedGasLimit)) {
    warnings.gasLimit = new GasLessThanEstimate();
  }

  return Promise.resolve(result);
};

const getNetworkInfoByOneGasPrice = async (c) => {
  const { gas_price } = await getEstimatedFees(c);
  const initial = BigNumber(gas_price);
  const gasPrice = inferDynamicRange(initial);
  return { family: "ethereum", gasPrice };
};

const getNetworkInfoByGasTrackerBarometer = async (c) => {
  const api = apiForCurrency(c);
  const { low, medium, high } = await api.getGasTrackerBarometer();
  const minValue = low;
  const maxValue = high.lte(low) ? low.times(2) : high;
  const initial = medium;
  const gasPrice = inferDynamicRange(initial, { minValue, maxValue });
  return { family: "ethereum", gasPrice };
};

const getNetworkInfo = (c) =>
  getNetworkInfoByGasTrackerBarometer(c).catch((e) => {
    // TODO: drop this fallback when the API is 100% in production
    if (e.status === 404) {
      return getNetworkInfoByOneGasPrice(c);
    }
    throw e;
  });

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> => {
  const networkInfo = t.networkInfo || (await getNetworkInfo(a.currency));
  const gasPrice = t.gasPrice || networkInfo.gasPrice.initial;

  if (t.gasPrice !== gasPrice || t.networkInfo !== networkInfo) {
    t = { ...t, networkInfo, gasPrice };
  }

  let estimatedGasLimit;
  const request = inferEthereumGasLimitRequest(a, t);
  if (request.to) {
    estimatedGasLimit = await estimateGasLimit(a, request.to, request);
  }

  if (
    !t.estimatedGasLimit ||
    (estimatedGasLimit && !estimatedGasLimit.eq(t.estimatedGasLimit))
  ) {
    t.estimatedGasLimit = estimatedGasLimit;
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
    subAccountId: account.type === "Account" ? null : account.id,
    ...transaction,
    recipient:
      transaction?.recipient || "0x0000000000000000000000000000000000000000",

    useAllAmount: true,
  });
  const s = await getTransactionStatus(mainAccount, t);
  return s.amount;
};

const currencyBridge: CurrencyBridge = {
  preload,
  hydrate,
  scanAccounts,
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  estimateMaxSpendable,
  getTransactionStatus,
  sync,
  receive,
  signOperation,
  broadcast,
};

export default { currencyBridge, accountBridge };
