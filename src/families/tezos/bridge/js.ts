// @flow
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import { TezosToolkit, DEFAULT_FEE } from "@taquito/taquito";
import {
  AmountRequired,
  NotEnoughBalance,
  NotEnoughBalanceToDelegate,
  FeeTooHigh,
  NotSupportedLegacyAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  RecommendUndelegation,
} from "@ledgerhq/errors";
import { validateRecipient } from "../../../bridge/shared";
import type { CurrencyBridge, AccountBridge } from "../../../types";
import {
  makeSync,
  makeScanAccounts,
  makeAccountBridgeReceive,
} from "../../../bridge/jsHelpers";
import { getMainAccount } from "../../../account";
import type { Transaction } from "../types";
import { getAccountShape } from "../synchronisation";
import { fetchAllBakers, hydrateBakers, isAccountDelegating } from "../bakers";
import { getEnv } from "../../../env";
import { signOperation } from "../signOperation";
import { patchOperationWithHash } from "../../../operation";
import { log } from "@ledgerhq/logs";

const receive = makeAccountBridgeReceive();

const createTransaction: () => Transaction = () => ({
  family: "tezos",
  mode: "send",
  amount: new BigNumber(0),
  fees: null,
  gasLimit: null,
  storageLimit: null,
  recipient: "",
  networkInfo: null,
  useAllAmount: false,
  taquitoError: null,
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const getTransactionStatus = async (account, t) => {
  const errors: {
    recipient?: Error,
    amount?: Error,
    fees?: Error,
  } = {};

  const warnings: {
    amount?: Error,
    feeTooHigh?: Error,
    recipient?: Error,
  } = {};

  let estimatedFees = new BigNumber(0);

  invariant(account.tezosResources, "tezosResources is missing");
  const { tezosResources } = account;

  if (!t.taquitoError) {
    if (t.mode !== "undelegate") {
      if (account.freshAddress === t.recipient) {
        errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
      } else {
        const { recipientError, recipientWarning } = await validateRecipient(
          account.currency,
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

    if (t.recipient.startsWith("KT") && !errors.recipient) {
      errors.recipient = new NotSupportedLegacyAddress();
    }

    // no fee / not enough balance already handled by taquitoError
    // t.fees will always be set

    estimatedFees = t.fees;
    if (!tezosResources.revealed) {
      // FIXME
      // https://github.com/ecadlabs/taquito/commit/48a11cfaffe4c6bdfa6f04ebbd0b756f4b135865#diff-3b138622526cbaa55605b79011aa411652367136a3e92e43faecc654da3854e7
      estimatedFees = estimatedFees.plus(374 || DEFAULT_FEE.REVEAL);
    }

    if (t.mode === "send") {
      if (!errors.amount && t.amount.eq(0)) {
        errors.amount = new AmountRequired();
      } else if (t.amount.gt(0) && estimatedFees.times(10).gt(t.amount)) {
        warnings.feeTooHigh = new FeeTooHigh();
      }

      const thresholdWarning = 0.5 * 10 ** account.currency.units[0].magnitude;

      if (
        !errors.amount &&
        account.balance
          .minus(t.amount)
          .minus(estimatedFees)
          .lt(thresholdWarning)
      ) {
        if (isAccountDelegating(account)) {
          warnings.amount = new RecommendUndelegation();
        }
      }
    }
  } else {
    log("taquitoerror", String(t.taquitoError));

    // remap taquito errors
    if (t.taquitoError === "proto.010-PtGRANAD.contract.balance_too_low") {
      if (t.mode === "send") {
        errors.amount = new NotEnoughBalance();
      } else {
        errors.amount = new NotEnoughBalanceToDelegate();
      }
    }
  }

  const result = {
    errors,
    warnings,
    estimatedFees,
    amount: t.amount,
    totalSpent: t.amount.plus(estimatedFees),
  };
  return Promise.resolve(result);
};

const prepareTransaction = async (account, transaction) => {
  invariant(account.tezosResources, "tezosResources is missing");
  const { tezosResources } = account;

  const tezos = new TezosToolkit(getEnv("API_TEZOS_NODE"));

  tezos.setProvider({
    // @ts-ignore
    signer: {
      publicKeyHash: async () => account.freshAddress,
      publicKey: async () => tezosResources.publicKey,
    },
  });

  try {
    // FIXME: tezos estimate throws with amount 0
    // what to do ?
    if (transaction.useAllAmount) {
      transaction.amount = new BigNumber(0);
    }

    let out;
    switch (transaction.mode) {
      case "send":
        out = await tezos.estimate.transfer({
          to: transaction.recipient,
          amount: transaction.amount.div(10 ** 6),
        });
        break;
      case "delegate":
        out = await tezos.estimate.setDelegate({
          source: account.freshAddress,
          delegate: transaction.recipient,
        });
        break;
      case "undelegate":
        out = await tezos.estimate.setDelegate({
          source: account.freshAddress,
        });
        break;
      default:
        throw "unsuported";
    }

    transaction.fees = new BigNumber(out.suggestedFeeMutez);
    transaction.gasLimit = new BigNumber(out.gasLimit);
    transaction.storageLimit = new BigNumber(out.storageLimit);

    if (transaction.useAllAmount) {
      const s = await getTransactionStatus(account, transaction);
      transaction.amount = account.balance.minus(s.estimatedFees);
    }
  } catch (e) {
    transaction.taquitoError = e.id;
  }

  return transaction;
};

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const t = await prepareTransaction(mainAccount, {
    ...createTransaction(),
    ...transaction,
    // this seed is empty (worse case scenario is to send to new). addr from: 1. eyebrow 2. odor 3. rice 4. attack 5. loyal 6. tray 7. letter 8. harbor 9. resemble 10. sphere 11. system 12. forward 13. onion 14. buffalo 15. crumble
    recipient: transaction?.recipient || "tz1VJitLYB31fEC82efFkLRU4AQUH9QgH3q6",
    useAllAmount: new BigNumber(0),
  });
  const s = await getTransactionStatus(mainAccount, t);
  return s.amount;
};

const broadcast = async ({ signedOperation: { operation } }) => {
  const tezos = new TezosToolkit(getEnv("API_TEZOS_NODE"));
  // @ts-ignore
  const hash = await tezos.contract.context.injector.inject(
    operation.extra.opbytes
  );
  return patchOperationWithHash(operation, hash);
};

const scanAccounts = makeScanAccounts(getAccountShape);

const sync = makeSync(getAccountShape);

const getPreloadStrategy = (_currency) => ({
  preloadMaxAge: 30 * 1000,
});

const preload = async () => {
  const bakers = await fetchAllBakers();
  return { bakers };
};

const hydrate = (data: any) => {
  if (!data || typeof data !== "object") return;
  const { bakers } = data;
  if (!bakers || typeof bakers !== "object" || !Array.isArray(bakers)) return;
  hydrateBakers(bakers);
};

const currencyBridge: CurrencyBridge = {
  getPreloadStrategy,
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
