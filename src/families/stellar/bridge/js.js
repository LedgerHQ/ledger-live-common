// @flow
import { Observable } from "rxjs";
import { BigNumber } from "bignumber.js";
import last from "lodash/last";
import type { Transaction } from "../types";
import type { Account, Operation } from "../../../types";
import type { AccountBridge, CurrencyBridge } from "../../../types/bridge";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import {
  derivationModeSupportsIndex,
  getDerivationModesForCurrency,
  isIterableDerivationMode
} from "../../../derivation";
import getAddress from "../../../hw/getAddress";
import { open } from "../../../hw";
import { getAccountPlaceholderName } from "../../../account";
import api, { parseAPIValue } from "./api";
import { getDerivationScheme, runDerivationScheme } from "../../../types";
import {
  FeeNotLoaded,
  FeeRequired,
  FeeTooHigh,
  InvalidAddress,
  NotEnoughBalance
} from "@ledgerhq/errors";
import type { NetworkInfo } from "../../stellar/types";

const getCapabilities = () => ({
  canSync: true,
  canSend: true
});

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice: (currency, deviceId) =>
    Observable.create(o => {
      let emptyCount = 0;
      let finished = false;
      const unsubscribe = () => {
        finished = true;
      };

      async function stepAddress(
        index,
        { path: freshAddressPath, publicKey: freshAddress },
        derivationMode
      ): { account?: Account, complete?: boolean } {
        if (finished) return;
        let accountResult;
        let balance = new BigNumber(0);

        try {
          accountResult = await api.getServer().loadAccount(freshAddress);
          balance = api.getBalanceFromAccount(accountResult);
        } catch (e) {
          // Server throws if the account doesn't exist
          emptyCount++;
        }

        const accountId = `stellarjs:2:${currency.id}:${freshAddress}:${derivationMode}`;

        const account: Account = {
          type: "Account",
          id: accountId,
          derivationMode,
          xpub: "",
          name: getAccountPlaceholderName({
            currency,
            index,
            derivationMode
          }),
          seedIdentifier: freshAddress,
          freshAddress,
          freshAddressPath,
          freshAddresses: [
            {
              address: freshAddress,
              derivationPath: freshAddressPath
            }
          ],
          balance,
          blockHeight: 0,
          index,
          currency,
          operations: [],
          pendingOperations: [],
          unit: currency.units[0],
          lastSyncDate: new Date()
        };
        return { account };
      }

      async function main() {
        const transport = await open(deviceId);
        try {
          const derivationMode = getDerivationModesForCurrency(currency)[0];
          const derivationScheme = getDerivationScheme({
            derivationMode,
            currency
          });
          const stopAt = isIterableDerivationMode(derivationMode) ? 255 : 1;
          for (let index = 0; index < stopAt; index++) {
            if (!derivationModeSupportsIndex(derivationMode, index)) continue;
            const freshAddressPath = runDerivationScheme(
              derivationScheme,
              currency,
              {
                account: index
              }
            );
            const res = await getAddress(transport, {
              currency,
              path: freshAddressPath,
              derivationMode
            });
            if (finished) return;

            const r = await stepAddress(index, res, derivationMode);

            if (r.account) {
              o.next({ type: "discovered", account: r.account });
            }

            if (emptyCount > 0) {
              finished = true;
            }
          }
          o.complete();
        } catch (e) {
          o.error(e);
        } finally {
          if (transport) transport.close();
        }
      }

      main();

      return unsubscribe;
    })
};

const mergeOps = (existing: Operation[], newFetched: Operation[]) => {
  const ids = existing.map(o => o.id);
  const all = existing.concat(newFetched.filter(o => !ids.includes(o.id)));
  return all.sort((a, b) => b.date - a.date);
};

const createTransaction = () => ({
  family: "stellar",
  amount: BigNumber(0),
  recipient: "",
  fee: null,
  networkInfo: null,
  memo: undefined
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const prepareTransaction = async (a: Account, t: Transaction) => {
  let networkInfo: ?NetworkInfo = t.networkInfo;
  if (!networkInfo) {
    networkInfo = {
      family: "stellar",
      serverFee: BigNumber(await api.getBaseFee()),
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

const signAndBroadcast = (a, t, deviceId) =>
  Observable.create(async o => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const onSigned = () => {
      o.next({ type: "signed" });
    };
    const onOperationBroadcasted = operation => {
      o.next({ type: "broadcasted", operation });
    };
    api
      .doSignAndBroadcast({
        a,
        t,
        deviceId,
        isCancelled,
        onSigned,
        onOperationBroadcasted
      })
      .then(
        () => {
          o.complete();
        },
        e => {
          o.error(e);
        }
      );
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

const paymentsToOperation = async (id, payments, currency, account) => {
  const parsedPayments = [];
  for (const payment of payments) {
    let from;
    let to;
    let value;

    if (payment.type === "create_account") {
      from = payment.funder;
      to = payment.account;
      value = parseAPIValue(payment.starting_balance);
    } else {
      from = payment.from;
      to = payment.to;
      value = parseAPIValue(payment.amount);
    }

    const operation: Operation = {
      id: payment.id,
      hash: payment.transaction_hash,
      type: account === from ? "OUT" : "IN",
      accountId: id,
      value,
      fee: new BigNumber(await api.getBaseFee()),
      blockHash: payment.transaction_hash,
      blockHeight: +payment.paging_token,
      senders: [from],
      recipients: [to],
      date: new Date(payment.created_at),
      transactionSequenceNumber: payment.transaction_hash,
      extra: {}
    };

    if (payment.type === "create_account") {
      operation.senders = [payment.funder];
      operation.recipients = [payment.account];
    }

    parsedPayments.push(operation);
  }
  return parsedPayments;
};

const getTransactionStatus = async (a, t) => {
  const errors = {};
  const warnings = {};
  const estimatedFees = BigNumber(await api.getBaseFee());
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

  if (!api.isValidRecipient(t.recipient)) {
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

const startSync = ({ id, freshAddress, blockHeight, currency }) =>
  Observable.create(o => {
    let unsubscribed = false;
    let balance;
    let done = false;
    const server = api.getServer();

    async function main(_blockHeight) {
      if (unsubscribed) return;
      const payments = await server
        .payments()
        .cursor(_blockHeight)
        .forAccount(freshAddress)
        .order("asc")
        .limit(100)
        .call();

      const newOperations = [];
      if (
        payments.records.length &&
        last(payments.records).paging_token > _blockHeight
      ) {
        newOperations.push(
          ...(await paymentsToOperation(
            id,
            payments.records,
            currency,
            freshAddress
          ))
        );
        _blockHeight = last(newOperations).blockHeight;

        o.next(a => ({
          ...a,
          operations: mergeOps(a.operations, newOperations),
          blockHeight: _blockHeight || 0
        }));
      } else {
        const lastLedger = await api.getLastLedger();

        o.next(a => ({
          ...a,
          balance,
          blockHeight: +lastLedger.records[0].paging_token||0,
          pendingOperations: []
        }));
        done = true;
        o.complete();
      }

      if (!done) {
        main(_blockHeight);
      } else {
        o.complete();
      }
    }
    main(blockHeight);

    return () => {
      unsubscribed = true;
    };
  });

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
