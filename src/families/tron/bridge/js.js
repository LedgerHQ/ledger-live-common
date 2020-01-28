// @flow
import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import flatMap from "lodash/flatMap";
import compact from "lodash/compact";
import get from "lodash/get";
import type {
  Account,
  Operation,
  TokenAccount,
  SubAccount,
  TransactionStatus
} from "../../../types";
import type { NetworkInfo, Transaction } from "../types";
import {
  isParentTx,
  txInfoToOperation,
  getOperationTypefromMode,
  getEstimatedBlockSize
} from "../utils";
import type { CurrencyBridge, AccountBridge } from "../../../types/bridge";
import { findTokenById } from "../../../data/tokens";
import { open } from "../../../hw";
import signTransaction from "../../../hw/signTransaction";
import { makeSync, makeScanAccounts } from "../../../bridge/jsHelpers";
import { formatCurrencyUnit } from "../../../currencies";
import { getAccountUnit } from "../../../account";
import {
  InvalidAddress,
  RecipientRequired,
  NotEnoughBalance,
  AmountRequired,
  FeeRequired
} from "@ledgerhq/errors";
import { ModeNotSupported } from "../../../errors";
import { tokenList } from "../tokens-name-hex";
import {
  broadcastTron,
  claimRewardTronTransaction,
  createTronTransaction,
  extractBandwidthInfo,
  fetchTronAccount,
  fetchTronAccountTxs,
  getTronAccountNetwork,
  getTronResources,
  validateAddress,
  freezeTronTransaction,
  unfreezeTronTransaction,
  voteTronSuperRepresentatives
} from "../../../api/Tron";

const signOperation = ({ account, transaction, deviceId }) =>
  Observable.create(o => {
    async function main() {
      const subAccount =
        transaction.subAccountId && account.subAccounts
          ? account.subAccounts.find(sa => sa.id === transaction.subAccountId)
          : null;

      const getPreparedTransaction = () => {
        switch (transaction.mode) {
          case "freeze":
            return freezeTronTransaction(account, transaction);
          case "unfreeze":
            return unfreezeTronTransaction(account, transaction);
          case "vote":
            return voteTronSuperRepresentatives(account, transaction);
          case "claimReward":
            return claimRewardTronTransaction(account);
          default:
            return createTronTransaction(account, transaction, subAccount);
        }
      };

      const preparedTransaction = await getPreparedTransaction();
      const transport = await open(deviceId);

      try {
        o.next({ type: "device-signature-requested" });

        // Sign by device
        const signature = await signTransaction(
          account.currency,
          transport,
          account.freshAddressPath,
          {
            rawDataHex: preparedTransaction.raw_data_hex,
            // only for trc10, we need to put the assetName hex message
            assetName:
              subAccount &&
              subAccount.type === "TokenAccount" &&
              subAccount.token.id.includes("trc10")
                ? [
                    tokenList.find(
                      t => t.id.toString() === subAccount.token.id.split("/")[2]
                    ).message
                  ] // TODO: Find a better way to store this data ? where ? Not really typesafe too
                : undefined
          }
        );

        o.next({ type: "device-signature-granted" });

        const hash = preparedTransaction.txID;

        const fee = await getEstimatedFees(account, transaction);

        const value =
          transaction.mode === "send" ? transaction.amount : BigNumber(0);

        const operationType = getOperationTypefromMode(transaction.mode);

        const operation = {
          id: `${account.id}-${hash}-${operationType}`,
          hash,
          accountId: account.id,
          type: operationType,
          value,
          fee,
          blockHash: null,
          blockHeight: null,
          senders: [account.freshAddress],
          recipients: [transaction.recipient],
          date: new Date(),
          extra: {}
        };

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature,
            signatureRaw: preparedTransaction.raw_data,
            expirationDate: null
          }
        });
      } finally {
        transport.close();
      }
    }

    main().then(
      () => o.complete(),
      e => o.error(e)
    );
  });

const broadcast = async ({
  signedOperation: { signature, operation, signatureRaw }
}) => {
  const transaction = {
    raw_data: signatureRaw,
    txID: operation.hash,
    signature: [signature]
  };

  const submittedTransaction = await broadcastTron(transaction);

  if (submittedTransaction.result !== true) {
    throw new Error(submittedTransaction.resultMessage);
  }

  return operation;
};

const getAccountShape = async info => {
  const tronAcc = await fetchTronAccount(info.address);

  if (tronAcc.length === 0) {
    return { balance: BigNumber(0) };
  }

  const acc = tronAcc[0];
  const spendableBalance = acc.balance ? BigNumber(acc.balance) : BigNumber(0);
  const resources = await getTronResources(acc);

  const balance = spendableBalance
    .plus(
      resources.frozen.bandwidth
        ? BigNumber(resources.frozen.bandwidth.amount)
        : BigNumber(0)
    )
    .plus(
      resources.frozen.energy
        ? BigNumber(resources.frozen.energy.amount)
        : BigNumber(0)
    );

  const txs = await fetchTronAccountTxs(info.address, txs => txs.length < 1000);

  const parentTxs = txs.filter(isParentTx);
  const parentOperations: Operation[] = compact(
    parentTxs.map(tx => txInfoToOperation(info.id, info.address, tx))
  );

  const trc10Tokens = get(acc, "assetV2", []).map(({ key, value }) => ({
    type: "trc10",
    key,
    value
  }));
  const trc20Tokens = get(acc, "trc20", []).map(obj => {
    const [[key, value]] = Object.entries(obj);
    return { type: "trc20", key, value };
  });

  // TRC10 and TRC20 accounts
  const subAccounts: SubAccount[] = compact(
    trc10Tokens.concat(trc20Tokens).map(({ type, key, value }) => {
      const token = findTokenById(`tron/${type}/${key}`);
      if (!token) return;
      const id = info.id + "+" + key;
      const tokenTxs = txs.filter(tx => tx.tokenId === key);
      const operations = compact(
        tokenTxs.map(tx => txInfoToOperation(id, info.address, tx))
      );
      const sub: TokenAccount = {
        type: "TokenAccount",
        id,
        starred: false,
        parentId: info.id,
        token,
        balance: BigNumber(value),
        operationsCount: operations.length,
        operations,
        pendingOperations: []
      };
      return sub;
    })
  );

  // get 'OUT' token operations with fee
  const subOutOperationsWithFee: Operation[] = flatMap(
    subAccounts.map(s => s.operations)
  )
    .filter(o => o.type === "OUT" && o.fee.isGreaterThan(0))
    .map(o => ({ ...o, accountId: info.id, value: o.fee }));

  // add them to the parent operations and sort by date desc
  const parentOpsAndSubOutOpsWithFee = parentOperations
    .concat(subOutOperationsWithFee)
    .sort((a, b) => b.date - a.date);

  return {
    balance,
    spendableBalance,
    operationsCount: parentOpsAndSubOutOpsWithFee.length,
    operations: parentOpsAndSubOutOpsWithFee,
    subAccounts,
    resources
  };
};

const scanAccounts = makeScanAccounts(getAccountShape);

const sync = makeSync(getAccountShape);

const currencyBridge: CurrencyBridge = {
  preload: () => Promise.resolve(),
  hydrate: () => {},
  scanAccounts
};

const createTransaction = () => ({
  family: "tron",
  amount: BigNumber(0),
  mode: "send",
  duration: 3,
  recipient: "",
  networkInfo: null,
  resource: null,
  votes: []
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

// see : https://developers.tron.network/docs/bandwith#section-bandwidth-points-consumption
// 1. cost around 200 Bandwidth, if not enough check Free Bandwidth
// 2. If not enough, will cost some TRX
// 3. normal transfert cost around 0.002 TRX
const getFeesFromBandwidth = (a: Account, t: Transaction): BigNumber => {
  const { freeUsed, freeLimit, gainedUsed, gainedLimit } = extractBandwidthInfo(
    t.networkInfo
  );
  const available = freeLimit - freeUsed + gainedLimit - gainedUsed;

  const estimatedBandwidthCost = getEstimatedBlockSize(a, t);

  if (available < estimatedBandwidthCost) {
    return BigNumber(2000); // cost is around 0.002 TRX
  }

  return BigNumber(0); // no fee
};

// Special case: If activated an account, cost around 0.1 TRX
const getFeesFromAccountActivation = async (
  a: Account,
  t: Transaction
): Promise<BigNumber> => {
  const recipientAccount = await fetchTronAccount(t.recipient);
  const { gainedUsed, gainedLimit } = extractBandwidthInfo(t.networkInfo);
  const available = gainedLimit - gainedUsed;

  const estimatedBandwidthCost = getEstimatedBlockSize(a, t);

  if (recipientAccount.length === 0 && available < estimatedBandwidthCost) {
    return BigNumber(100000); // cost is around 0.1 TRX
  }

  return BigNumber(0); // no fee
};

const getEstimatedFees = async (a: Account, t: Transaction) => {
  const feesFromAccountActivation =
    t.mode === "send" ? await getFeesFromAccountActivation(a, t) : BigNumber(0);

  if (feesFromAccountActivation.gt(0)) {
    return feesFromAccountActivation;
  }

  const feesFromBandwidth = getFeesFromBandwidth(a, t);
  return feesFromBandwidth;
};

const getTransactionStatus = async (a, t): Promise<TransactionStatus> => {
  const errors: { [string]: Error } = {};
  const warnings: { [string]: Error } = {};

  const { mode, amount, recipient } = t;

  const tokenAccount = !t.subAccountId
    ? null
    : a.subAccounts && a.subAccounts.find(ta => ta.id === t.subAccountId);

  const account = tokenAccount || a;

  const balance =
    account.type === "Account" ? account.spendableBalance : account.balance;

  if (!["send", "freeze", "unfreeze", "vote", "claimReward"].includes(mode)) {
    errors.mode = new ModeNotSupported();
  }

  if (mode === "send" && !recipient) {
    errors.recipient = new RecipientRequired();
  }

  if (
    ["send", "freeze"].includes(mode) &&
    recipient &&
    !(await validateAddress(recipient))
  ) {
    errors.recipient = new InvalidAddress(null, {
      currencyName: a.currency.name
    });
  }

  if (["send", "freeze"].includes(mode) && amount.eq(0)) {
    errors.amount = new AmountRequired();
  }

  const estimatedFees =
    Object.entries(errors).length > 0
      ? BigNumber(0)
      : await getEstimatedFees(a, t);

  const totalSpent = amount.plus(estimatedFees);

  if (estimatedFees.gt(0)) {
    const formattedFees = formatCurrencyUnit(
      getAccountUnit(account),
      estimatedFees,
      {
        showCode: true,
        disableRounding: true
      }
    );

    warnings.fee = new FeeRequired(`Estimated fees: ${formattedFees}`);
  }

  if (totalSpent.gt(balance)) {
    errors.amount = new NotEnoughBalance();
  }

  return Promise.resolve({
    errors,
    warnings,
    amount,
    estimatedFees,
    totalSpent
  });
};

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> => {
  const networkInfo: NetworkInfo =
    t.networkInfo || (await getTronAccountNetwork(a.freshAddress));

  return t.networkInfo === networkInfo ? t : { ...t, networkInfo };
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  sync,
  signOperation,
  broadcast
};

export default { currencyBridge, accountBridge };
