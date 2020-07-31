// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import {
  AmountRequired,
  NotEnoughBalance,
  NotEnoughGas,
  FeeNotLoaded,
  FeeTooHigh,
  InvalidAddress,
  FeeRequired,
  GasLessThanEstimate,
  RecipientRequired,
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
import {
  isRecipientValid,
  getRecipientWarning,
} from "../customAddressValidation";

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

// TODO postSyncPatch ?
const sync = makeSync(getAccountShape);

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
});

const updateTransaction = (t, patch) => {
  if ("recipient" in patch && patch.recipient !== t.recipient) {
    return { ...t, ...patch, userGasLimit: null, estimatedGasLimit: null };
  }
  return { ...t, ...patch };
};

const getTransactionStatus = (a, t) => {
  const errors = {};
  const warnings = {};
  const tokenAccount = !t.subAccountId
    ? null
    : a.subAccounts && a.subAccounts.find((ta) => ta.id === t.subAccountId);
  const account = tokenAccount || a;

  // validate recipient
  let recipientWarning = getRecipientWarning(a.currency, t.recipient);
  if (recipientWarning) {
    warnings.recipient = recipientWarning;
  }
  if (!t.recipient) {
    errors.recipient = new RecipientRequired("");
  } else if (!isRecipientValid(a.currency, t.recipient)) {
    errors.recipient = new InvalidAddress("", {
      currencyName: a.currency.name,
    });
  }

  // validate amount and fees
  const gasLimit = getGasLimit(t);
  const estimatedFees = (t.gasPrice || BigNumber(0)).times(gasLimit);

  const totalSpent = t.useAllAmount
    ? account.balance
    : tokenAccount
    ? BigNumber(t.amount || 0)
    : BigNumber(t.amount || 0).plus(estimatedFees);

  const amount = t.useAllAmount
    ? tokenAccount
      ? tokenAccount.balance
      : account.balance.minus(estimatedFees)
    : BigNumber(t.amount || 0);

  if (!t.gasPrice) {
    errors.gasPrice = new FeeNotLoaded();
  } else if (gasLimit.eq(0)) {
    errors.gasLimit = new FeeRequired();
  } else if (!errors.recipient) {
    if (tokenAccount) {
      if (!t.useAllAmount && amount.gt(tokenAccount.balance)) {
        errors.amount = new NotEnoughBalance();
      }
      if (estimatedFees.gt(a.balance)) {
        errors.gasPrice = new NotEnoughGas();
      }
    } else {
      if (totalSpent.gt(a.balance)) {
        errors.amount = new NotEnoughBalance();
      }
    }
  }

  if (t.estimatedGasLimit && gasLimit.lt(t.estimatedGasLimit)) {
    warnings.gasLimit = new GasLessThanEstimate();
  }

  if (!tokenAccount && amount.gt(0) && estimatedFees.times(10).gt(amount)) {
    warnings.feeTooHigh = new FeeTooHigh();
  }

  if (!errors.amount && amount.eq(0)) {
    errors.amount = new AmountRequired();
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  });
};

const getNetworkInfo = async (c) => {
  const { gas_price } = await getEstimatedFees(c);
  return { family: "ethereum", gasPrice: BigNumber(gas_price) };
};

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> => {
  const tokenAccount = !t.subAccountId
    ? null
    : a.subAccounts && a.subAccounts.find((ta) => ta.id === t.subAccountId);

  const networkInfo = t.networkInfo || (await getNetworkInfo(a.currency));
  const gasPrice = t.gasPrice || networkInfo.gasPrice;

  if (t.gasPrice !== gasPrice || t.networkInfo !== networkInfo) {
    t = { ...t, networkInfo, gasPrice };
  }

  let estimatedGasLimit = BigNumber(21000); // fallback in case we can't calculate
  if (tokenAccount) {
    invariant(tokenAccount.type === "TokenAccount", "eth have token accounts");
    estimatedGasLimit = await estimateGasLimit(
      a,
      tokenAccount.token.contractAddress,
      inferEthereumGasLimitRequest(a, t)
    );
  } else if (t.recipient) {
    if (isRecipientValid(a.currency, t.recipient)) {
      estimatedGasLimit = await estimateGasLimit(
        a,
        t.recipient,
        inferEthereumGasLimitRequest(a, t)
      );
    }
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
