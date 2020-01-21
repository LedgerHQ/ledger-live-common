// @flow
import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import flatMap from "lodash/flatMap";
import compact from "lodash/compact";
import get from "lodash/get";
import bs58check from "bs58check";
import SHA256 from "crypto-js/sha256";
import type {
  Operation,
  TokenCurrency,
  TokenAccount,
  SubAccount,
  ChildAccount,
  TransactionStatus
} from "../../../types";
import type {
  NetworkInfo,
  Transaction,
  TrongridTxInfo
} from "../types";
import { encode58Check, isParentTx, txInfoToOperation } from "../utils";
import type { CurrencyBridge, AccountBridge } from "../../../types/bridge";
import { findTokenById } from "../../../data/tokens";
import { open } from "../../../hw";
import signTransaction from "../../../hw/signTransaction";
import { makeSync, makeScanAccounts } from "../../../bridge/jsHelpers";
import { validateRecipient } from "../../../bridge/shared";
import {
  InvalidAddress,
  RecipientRequired,
  NotEnoughBalance,
  AmountRequired
} from "@ledgerhq/errors";
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

const AVERAGE_BANDWIDTH_COST = 200;

const signOperation = ({ account, transaction, deviceId }) =>
  Observable.create(o => {
    async function main() {
      const subAccount =
        transaction.subAccountId && account.subAccounts
          ? account.subAccounts.find(sa => sa.id === transaction.subAccountId)
          : null;

      const getPreparedTransaction = () => {
        switch(transaction.mode) {
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
      }

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
            assetName: subAccount && subAccount.type === 'TokenAccount'
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

        // only if it's a send transaction
        // estimated fee
        const fee = transaction.mode === "send" 
          ? await getEstimatedFees(transaction) 
          : BigNumber(0);
        // value
        const value = transaction.mode === "send" 
          ? transaction.amount 
          : BigNumber(0);

        const operation = {
          id: `${account.id}-${hash}-OUT`,
          hash,
          accountId: account.id,
          type: "OUT",
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

const broadcast = async ({ signedOperation: { signature, operation, signatureRaw } }) => {
  const transaction = {
    raw_data: signatureRaw,
    txID: operation.hash,
    signature: [signature],
  };

  const submittedTransaction = await broadcastTron(transaction);

  if (submittedTransaction.result !== true) {
    throw new Error(submittedTransaction.resultMessage);
  }

  return operation;
}

const getAccountShape = async info => {
  const tronAcc = await fetchTronAccount(info.address);

  if (tronAcc.length === 0) {
    return { balance: BigNumber(0) };
  }

  const acc = tronAcc[0];
  const spendableBalance = acc.balance ? BigNumber(acc.balance) : BigNumber(0);
  const resources = await getTronResources(acc);

  const balance = spendableBalance
    .plus(resources.frozen.bandwidth ? BigNumber(resources.frozen.bandwidth.amount) : BigNumber(0))
    .plus(resources.frozen.energy ? BigNumber(resources.frozen.energy.amount) : BigNumber(0));

  const txs = await fetchTronAccountTxs(info.address, txs => txs.length < 1000);

  const parentTxs = txs.filter(isParentTx);
  const parentOperations: Operation[] = compact(parentTxs.map(tx => txInfoToOperation(info.id, info.address, tx)))

  const trc10Tokens = get(acc, "assetV2", []).map(({ key, value }) => ({ type: "trc10", key, value }));
  const trc20Tokens = get(acc, "trc20", []).map(obj => {
    const [[key, value]] = Object.entries(obj);
    return { type: "trc20", key, value };
  });

  // TRC10 and TRC20 accounts
  const subAccounts: SubAccount[] = 
    compact(
      trc10Tokens
        .concat(trc20Tokens)
        .map(({ type, key, value }) => {
          const token = findTokenById(`tron/${type}/${key}`);
          if (!token) return;
          const id = info.id + "+" + key;
          const tokenTxs = txs.filter(tx => tx.tokenId === key);
          const operations = compact(tokenTxs.map(tx => txInfoToOperation(id, info.address, tx)));
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
  const subOutOperationsWithFee: Operation[] = 
    flatMap(subAccounts.map(s => s.operations))
      .filter(o => o.type === 'OUT' && o.fee.isGreaterThan(0))
      .map(o => ({ ...o, accountId: info.id, value: o.fee }));

  // add them to the parent operations and sort by date desc
  const parentOpsAndSubOutOpsWithFee =
    parentOperations.concat(subOutOperationsWithFee).sort((a, b) => b.date - a.date)

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
const getFeesFromBandwidth = (networkInfo: ?NetworkInfo): BigNumber => {
  const { available } = extractBandwidthInfo(networkInfo);

  if (available < AVERAGE_BANDWIDTH_COST) {
    return BigNumber(2000); // cost is around 0.002 TRX
  }

  return BigNumber(0); // no fee
};

// Special case: If activated an account, cost around 0.1 TRX
const getFeesFromAccountActivation = async (recipient: string, networkInfo: ?NetworkInfo): Promise<BigNumber> => {
  const recipientAccount = await fetchTronAccount(recipient);
  const { available } = extractBandwidthInfo(networkInfo);

  if (recipientAccount.length === 0 && available < 10000) {
    return BigNumber(100000); // cost is around 0.1 TRX
  }

  return BigNumber(0); // no fee
};

const getEstimatedFees = async t => {
  const feesFromBandwidth = getFeesFromBandwidth(t.networkInfo);
  const feesFromAccountActivation = await getFeesFromAccountActivation(t.recipient);
  if (feesFromAccountActivation.gt(0)) {
    return feesFromAccountActivation;
  } 
  return feesFromBandwidth;
};

const getTransactionStatus = async (a, t): Promise<TransactionStatus> => {
  const errors: { [string]: Error } = {};
  const warnings: { [string]: Error } = {};

  const tokenAccount = !t.subAccountId
    ? null
    : a.subAccounts && a.subAccounts.find(ta => ta.id === t.subAccountId);

  const account = tokenAccount || a;

  if (!t.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (!(await validateAddress(t.recipient))) {
    errors.recipient = new InvalidAddress(null, { currencyName: a.currency.name });
  }

  const estimatedFees = errors.recipient
    ? BigNumber(0)
    : await getEstimatedFees(t); //TBD

  const amount = t.amount;

  const totalSpent = amount.plus(estimatedFees);

  if (totalSpent.gt(BigNumber(account.balance))) {
    errors.amount = new NotEnoughBalance();
  } else if (amount.eq(0)) {
    errors.amount = new AmountRequired();
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
