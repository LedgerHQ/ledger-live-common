// @flow
import { Observable } from "rxjs";
import { BigNumber } from "bignumber.js";
import type { Transaction } from "../types";
import type { Account, Operation } from "../../../types";
import type { AccountBridge, CurrencyBridge } from "../../../types/bridge";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import {
  FeeNotLoaded,
  FeeRequired,
  FeeTooHigh,
  InvalidAddress,
  NotEnoughBalance
} from "@ledgerhq/errors";
import type { NetworkInfo } from "../../stellar/types";
import flatMap from "lodash/flatMap";
import network from "../../../network";
import { log } from "@ledgerhq/logs";
import {
  makeScanAccountsOnDevice,
  makeStartSync
} from "../../../bridge/jsHelpers";
import { open } from "../../../hw";
import signTransaction from "../../../hw/signTransaction";
import { Asset, StrKey } from "stellar-base";
import { getCryptoCurrencyById } from "../../../types";
import { formatCurrencyUnit, parseCurrencyUnit } from "../../../currencies";

const getCapabilities = () => ({
  canSync: true,
  canSend: true
});

const root = "https://horizon.stellar.org";

async function fetch(maybeUrl) {
  const url = maybeUrl.startsWith("http") ? maybeUrl : root + maybeUrl;
  const { data: response } = await network({
    method: "GET",
    url
  });
  log("http", url);
  return response;
}

const post = async (maybeUrl, data) => {
  const url = maybeUrl.startsWith("http") ? maybeUrl : root + maybeUrl;

  try {
    const response = await network({
      method: "POST",
      url,
      data,
      config: {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    });

    return response;
  } catch (e) {
    log("http", e.response.data);
  }
};

const baseFee = 100; //Fixme and cache this.

// Consider getting the parent transaction instead? TODO
const rawOpToOp = ({ id, address }) => (operation: Object): any => {
  let from;
  let to;
  let value;

  if (operation.type === "create_account") {
    from = operation.funder;
    to = operation.account;
    value = parseAPIValue(operation.starting_balance);
  } else if (operation.type === "set_options") {
    return [];
  } else {
    from = operation.from;
    to = operation.to;
    value = parseAPIValue(operation.amount);
  }

  const type = address === from ? "OUT" : "IN";

  return {
    id: `${id}-${operation.transaction_hash}-${type}`,
    hash: operation.transaction_hash,
    type,
    value,
    fee: new BigNumber(baseFee), // FIXME
    blockHash: operation.transaction_hash,
    blockHeight: +operation.paging_token,
    accountId: id,
    senders: [from],
    recipients: [to],
    date: new Date(operation.created_at)
  };
};

async function fetchOperations(
  addr: string,
  shouldFetchMoreOps: (Operation[]) => boolean
) {
  const limit = 100;
  let payload = await fetch(
    `/accounts/${addr}/operations/?limit=${limit}&order=asc`
  );
  let txs = [];
  while (
    payload &&
    payload._embedded.records.length &&
    payload._links.next &&
    shouldFetchMoreOps(txs)
    ) {
    txs = txs.concat(payload._embedded.records);
    payload = await fetch(payload._links.next.href);
  }
  return txs;
}

const getAccountShape = async info => {
  let accountShape = {
    balance: BigNumber(0),
    operations: [],
    blockHeight: 0 //Actually fetch it
  };

  try {
    const payload = await fetch(`/accounts/${info.address}`);
    accountShape.blockHeight = payload.last_modified_ledger;
    const nativeBalance = payload.balances.find(b => b.asset_type === "native");
    if (nativeBalance) {
      accountShape.balance = parseAPIValue(nativeBalance.balance);
    }

    const ops = await fetchOperations(info.address, ops => ops.length < 100);
    accountShape.operations = flatMap(ops, rawOpToOp(info));
  } catch (e) {
    // Server throws if the account doesn't exist
  }

  return accountShape;
};

const scanAccountsOnDevice = makeScanAccountsOnDevice(getAccountShape);

const startSync = makeStartSync(getAccountShape);

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice
};

const createTransaction = () => ({
  family: "stellar",
  amount: BigNumber(0),
  recipient: "",
  fee: null,
  networkInfo: null,
  memo: undefined,
  memoType: undefined
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const prepareTransaction = async (a: Account, t: Transaction) => {
  let networkInfo: ?NetworkInfo = t.networkInfo;
  if (!networkInfo) {
    networkInfo = {
      family: "stellar",
      serverFee: BigNumber(100), // FIXME NOT USED. will refactor later.
      baseReserve: BigNumber(100) // FIXME NOT USED. will refactor later.
    };
  }
  const fee = t.fee || networkInfo.serverFee;

  if (t.networkInfo !== networkInfo || t.fee !== fee) {
    return {
      ...t,
      networkInfo,
      fee
    };
  }

  return t;
};

const stellarUnit = getCryptoCurrencyById("stellar").units[0];

export const parseAPIValue = (value: string) => {
  if (!value) {
    return new BigNumber(0);
  }
  return parseCurrencyUnit(stellarUnit, `${value}`);
};

const formatAPICurrency = (amount: BigNumber) =>
  formatCurrencyUnit(stellarUnit, amount, {
    showAllDigits: true,
    disableRounding: true,
    useGrouping: false
  });

const signAndBroadcast = (a, t, deviceId) =>
  Observable.create(async o => {
    let cancelled = false;
    const transport = await open(deviceId);
    const signedTransactionXDR = await signTransaction(
      a.currency,
      transport,
      a.freshAddressPath,
      {
        freshAddress: a.freshAddress,
        destination: t.recipient,
        asset: Asset.native(),
        memo: t.memo,
        memoType: t.memoType, //TODO support memos
        fee: formatAPICurrency(t.fee || BigNumber(100)),
        amount: formatAPICurrency(t.amount)
      }
    );

    if (!cancelled) {
      o.next({ type: "signed" });
      const transactionResult = await post(
        "/transactions",
        `tx=${encodeURIComponent(signedTransactionXDR)}`
      );

      const hash = transactionResult ? transactionResult.hash : "hash"; //Should never happen

      o.next({
        type: "broadcasted",
        operation: {
          id: `${a.id}-${hash}-OUT`,
          hash,
          accountId: a.id,
          type: "OUT",
          value: new BigNumber(t.amount),
          fee: new BigNumber(t.fee || BigNumber(100)),
          blockHash: null,
          blockHeight: null,
          senders: [a.freshAddressPath],
          recipients: [t.recipient],
          date: new Date(),
          extra: {},
          transactionSequenceNumber:
            (a.operations.length > 0
              ? a.operations[0].transactionSequenceNumber
              : 0) + a.pendingOperations.length
        }
      });
    }
    return () => {
      cancelled = true;
    };
  });

const fillUpExtraFieldToApplyTransactionNetworkInfo = async (
  a,
  t,
  networkInfo
) => ({
  fee: t.fee || networkInfo.serverFee
});

const getTransactionStatus = async (a, t) => {
  const errors = {};
  const warnings = {};
  const estimatedFees = BigNumber(100); //FIXME
  const totalSpent = BigNumber(t.amount || 0).plus(estimatedFees);
  const amount = BigNumber(t.amount || 0);

  if (amount.gt(0) && estimatedFees.times(10).gt(amount)) {
    warnings.feeTooHigh = new FeeTooHigh();
  }

  if (totalSpent.gt(a.balance)) {
    errors.amount = new NotEnoughBalance();
  }

  if (!t.fee) {
    errors.fee = new FeeNotLoaded();
  } else if (t.fee.eq(0)) {
    errors.fee = new FeeRequired();
  }

  if (!StrKey.isValidEd25519PublicKey(t.recipient)) {
    errors.recipient = new InvalidAddress("", {
      currencyName: a.currency.name
    });
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent
  });
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  signAndBroadcast,
  startSync,
  getCapabilities,
  ...inferDeprecatedMethods({
    name: "StellarJSBridge",
    createTransaction,
    getTransactionStatus,
    prepareTransaction,
    fillUpExtraFieldToApplyTransactionNetworkInfo
  })
};

export default { currencyBridge, accountBridge };
