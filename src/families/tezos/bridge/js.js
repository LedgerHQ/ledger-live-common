// @flow
import { BigNumber } from "bignumber.js";
import { TezosToolkit, DEFAULT_FEE } from "@taquito/taquito";
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

const getTransactionStatus = async (account, t) => {
  let estimatedFees = t.fees;
  if (!account.tezosResources.revealed) {
    // FIXME
    // https://github.com/ecadlabs/taquito/commit/48a11cfaffe4c6bdfa6f04ebbd0b756f4b135865#diff-3b138622526cbaa55605b79011aa411652367136a3e92e43faecc654da3854e7
    estimatedFees = estimatedFees.plus(374 || DEFAULT_FEE.REVEAL);
  }
  const errors = {};
  const warnings = {};
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
  const tezos = new TezosToolkit(getEnv("API_TEZOS_NODE"));

  tezos.setProvider({
    signer: {
      publicKeyHash: async () => account.freshAddress,
      publicKey: async () => account.tezosResources.publicKey,
    },
  });

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
        delegate: transaction.recipient,
      });
      break;
    case "undelegate":
      // FIXME
      throw "not implemented yet";
    default:
      throw "unsuported";
  }

  transaction.fees = new BigNumber(out.suggestedFeeMutez);
  transaction.gasLimit = new BigNumber(out.gasLimit);
  transaction.storageLimit = new BigNumber(out.storageLimit);

  return transaction;
};

// FIXME
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
