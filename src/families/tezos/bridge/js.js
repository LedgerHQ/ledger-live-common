// @flow
import { BigNumber } from "bignumber.js";
import { TezosToolkit } from "@taquito/taquito";
import type { CurrencyBridge, AccountBridge } from "../../../types";
import {
  makeSync,
  makeScanAccounts,
  makeAccountBridgeReceive,
} from "../../../bridge/jsHelpers";
import { getMainAccount } from "../../../account";
import type { Transaction } from "../types";
import { getAccountShape } from "../synchronisation";
import { fetchAllBakers, hydrateBakers } from "../bakers";
import { getEnv } from "../../../env";
import { signOperation } from "../signOperation";
import { patchOperationWithHash } from "../../../operation";

const receive = makeAccountBridgeReceive();

const createTransaction = () => ({
  family: "tezos",
  mode: "send",
  amount: BigNumber(0),
  fees: null,
  gasLimit: null,
  storageLimit: null,
  recipient: "",
  networkInfo: null,
  useAllAmount: false,
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const getTransactionStatus = async (a, t) => {
  const estimatedFees = t.fees;
  const errors = {};
  const warnings = {};
  const result = {
    errors,
    warnings,
    estimatedFees,
    amount: t.amount,
    totalSpent: t.amount.plus(t.fees),
  };
  return Promise.resolve(result);
};

const prepareTransaction = async (account, transaction) => {
  const tezos = new TezosToolkit(getEnv("API_TEZOS_NODE"));

  tezos.setProvider({
    signer: {
      publicKeyHash: async () => account.freshAddress,
      publicKey: async () => account.tezosResources.publicKey,
    },
  });

  const out = await tezos.estimate.transfer({
    to: transaction.recipient,
    amount: transaction.amount.div(10 ** 6),
  });

  transaction.fees = new BigNumber(out.totalCost).plus(100); // why need to add 100 ?
  transaction.gasLimit = new BigNumber(out.gasLimit);
  transaction.storageLimit = new BigNumber(out.storageLimit);

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
    subAccountId: account.type === "Account" ? null : account.id,
    ...transaction,
    // this seed is empty (worse case scenario is to send to new). addr from: 1. eyebrow 2. odor 3. rice 4. attack 5. loyal 6. tray 7. letter 8. harbor 9. resemble 10. sphere 11. system 12. forward 13. onion 14. buffalo 15. crumble
    recipient: transaction?.recipient || "tz1VJitLYB31fEC82efFkLRU4AQUH9QgH3q6",
    useAllAmount: true,
  });
  const s = await getTransactionStatus(mainAccount, t);
  return s.amount;
};

const broadcast = async ({ signedOperation: { operation } }) => {
  const tezos = new TezosToolkit(getEnv("API_TEZOS_NODE"));
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

const hydrate = (data: mixed) => {
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
