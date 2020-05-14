// @flow
import { scanAccounts } from "../../../libcore/scanAccounts";
import { sync } from "../../../libcore/syncAccount";
import type { AccountBridge, CurrencyBridge } from "../../../types";
import type { Transaction } from "../types";
import { BigNumber } from "bignumber.js";
import broadcast from "../libcore-broadcast";
import signOperation from "../libcore-signOperation";
import { getMainAccount } from "../../../account";
import { makeLRUCache } from "../../../cache";
import { validateRecipient } from "../../../bridge/shared";
import { getFeesForTransaction } from "../../../libcore/getFeesForTransaction";
import {
  NotEnoughBalance,
  InvalidAddressBecauseDestinationIsAlsoSource,
  InvalidAddress
} from "@ledgerhq/errors";
import {
  CosmosTooMuchRedelegations,
  CosmosTooMuchUnboundings,
  CosmosRedelegationInProgress
} from "../../../errors";

const calculateFees = makeLRUCache(
  async (a, t) => {
    return getFeesForTransaction({
      account: a,
      transaction: t
    });
  },
  (a, t) =>
    `${a.id}_${t.amount.toString()}_${t.recipient}_${
      t.gasLimit ? t.gasLimit.toString() : ""
    }_${t.fees ? t.fees.toString() : ""}
    _${String(t.useAllAmount)}_${t.mode}_${
      t.validators ? t.validators.map(v => v.address).join("-") : ""
    }`
);

const createTransaction = () => ({
  family: "cosmos",
  mode: "send",
  amount: BigNumber(0),
  fees: null,
  gasLimit: null,
  recipient: "",
  useAllAmount: false,
  networkInfo: null,
  memo: null,
  cosmosSourceValidator: null,
  validators: []
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const redelegationStatusError = (a, t) => {
  if (a.cosmosResources) {
    const redelegations = a.cosmosResources.redelegations;

    if (redelegations.length >= 7) {
      return new CosmosTooMuchRedelegations();
    }

    for (let i = 0; redelegations.length < i; i++) {
      let dstValidator = redelegations[i].validatorDstAddress;
      if (
        dstValidator === t.cosmosSourceValidator &&
        redelegations[i].completionDate > new Date()
      ) {
        return new CosmosRedelegationInProgress();
      }
    }
  }
  return null;
};

const getTransactionStatus = async (a, t) => {
  const errors = {};
  const warnings = {};

  if (t.mode === "redelegate") {
    const redelegationError = redelegationStatusError(a, t);
    if (redelegationError) {
      errors.redelegation = redelegationError;
    }
  } else if (t.mode === "undelegate") {
    if (a.cosmosResources && a.cosmosResources.unbondings.length >= 7) {
      errors.unbondings = new CosmosTooMuchUnboundings();
    }
  } else if (
    ["delegate", "claimReward", "claimRewardCompound"].includes(t.mode)
  ) {
    if (
      t.validators.some(v => !v.address || !v.address.includes("cosmosvaloper"))
    )
      errors.recipient = new InvalidAddress(null, {
        currencyName: a.currency.name
      });
  } else {
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
  }

  let estimatedFees = BigNumber(0);
  let amount = t.amount;

  if (!errors.recipient) {
    await calculateFees(a, t).then(
      res => {
        estimatedFees = res.estimatedFees;
      },
      error => {
        if (error.name === "NotEnoughBalance") {
          errors.amount = error;
        } else {
          throw error;
        }
      }
    );
  }

  let totalSpent = !t.useAllAmount
    ? t.amount.plus(estimatedFees)
    : a.balance.minus(estimatedFees);

  if (
    !errors.recipient &&
    !errors.amount &&
    (amount.lt(0) || totalSpent.gt(a.balance))
  ) {
    errors.amount = new NotEnoughBalance();
    totalSpent = BigNumber(0);
    amount = BigNumber(0);
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
  return t;
};

const currencyBridge: CurrencyBridge = {
  preload: async () => {},
  hydrate: () => {},
  scanAccounts
};

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction
}) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const t = await prepareTransaction(mainAccount, {
    ...createTransaction(),
    recipient: "rHsMGQEkVNJmpGWs8XUBoTBiAAbwxZN5v3", // public testing seed abandonx11,about
    ...transaction,
    useAllAmount: true
  });
  const s = await getTransactionStatus(mainAccount, t);
  return s.amount;
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  estimateMaxSpendable,
  sync,
  signOperation,
  broadcast
};

export default { currencyBridge, accountBridge };
