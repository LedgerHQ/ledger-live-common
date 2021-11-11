import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  RecipientRequired,
  InvalidAddress,
  FeeTooHigh,
} from "@ledgerhq/errors";
import type { Transaction } from "../types";
import type { Account, AccountBridge, CurrencyBridge } from "../../../types";
import {
  scanAccounts,
  signOperation,
  broadcast,
  sync,
  isInvalidRecipient,
} from "../../../bridge/mockHelpers";
import { getMainAccount } from "../../../account";
import { makeAccountBridgeReceive } from "../../../bridge/mockHelpers";

const receive = makeAccountBridgeReceive();

const createTransaction = (): Transaction => ({
  //mode: { kind: "native" },
  family: "solana",
  amount: new BigNumber(0),
  recipient: "",
  state: {
    kind: "unprepared",
    mode: {
      kind: "transfer",
    },
  },
});

const updateTransaction = (t: Transaction, patch: Partial<Transaction>) => ({
  ...t,
  ...patch,
});

const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => ({
  ...t,
  //feeCalculator: new BigNumber(1),
  /*
  networkInfo: {
    family: "solana",
    lamportsPerSignature: new BigNumber(1),
  },
  */
});

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const estimatedFees = transaction?.fees || new BigNumber(5000);
  return BigNumber.max(0, mainAccount.balance.minus(estimatedFees));
};

const getTransactionStatus = (account, t) => {
  const errors: any = {};
  const warnings: any = {};
  const useAllAmount = !!t.useAllAmount;

  const estimatedFees = new BigNumber(5000);

  const totalSpent = useAllAmount
    ? account.balance
    : new BigNumber(t.amount).plus(estimatedFees);

  const amount = useAllAmount
    ? account.balance.minus(estimatedFees)
    : new BigNumber(t.amount);

  if (amount.gt(0) && estimatedFees.times(10).gt(amount)) {
    warnings.amount = new FeeTooHigh();
  }

  if (totalSpent.gt(account.balance)) {
    errors.amount = new NotEnoughBalance();
  }

  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (isInvalidRecipient(t.recipient)) {
    errors.recipient = new InvalidAddress();
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  });
};

const accountBridge: AccountBridge<Transaction> = {
  estimateMaxSpendable,
  createTransaction,
  updateTransaction,
  getTransactionStatus,
  prepareTransaction,
  sync,
  receive,
  signOperation,
  broadcast,
};

const currencyBridge: CurrencyBridge = {
  scanAccounts,
  preload: async (_: any) => ({} as any),
  hydrate: () => {},
};

export default { currencyBridge, accountBridge };