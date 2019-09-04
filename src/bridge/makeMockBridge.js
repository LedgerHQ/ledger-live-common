// @flow
import Prando from "prando";
import { Observable } from "rxjs";
import { BigNumber } from "bignumber.js";
import {
  SyncError,
  NotEnoughBalance,
  NotEnoughBalanceBecauseDestinationNotCreated,
  InvalidAddressBecauseDestinationIsAlsoSource
} from "@ledgerhq/errors";
import { genAccount, genOperation } from "../mock/account";
import { getOperationAmountNumber } from "../operation";
import { validateNameEdition } from "../account";
import type {
  Operation,
  Account,
  Transaction,
  AccountBridge,
  CurrencyBridge
} from "../types";
import { getFeeItems } from "../api/FeesBitcoin";
import { getEstimatedFees } from "../api/Fees";
import { getCryptoCurrencyById } from "../data/cryptocurrencies";
import { inferDeprecatedMethods } from "./deprecationUtils";

const MOCK_DATA_SEED = process.env.MOCK_DATA_SEED || Math.random();

export const defaultGetFees = (a: Account, t: *) => {
  switch (t.family) {
    case "ethereum":
      return (t.gasPrice || BigNumber(0)).times(t.gasLimit);
    case "bitcoin":
      return (t.feePerByte || BigNumber(0)).times(250);
    case "ripple":
      return t.fee || BigNumber(0);
    default:
      return BigNumber(0);
  }
};

const defaultOpts = {
  transactionsSizeTarget: 100,
  scanAccountDeviceSuccessRate: 1
};

const delay = ms => new Promise(success => setTimeout(success, ms));

type Opts = typeof defaultOpts;

export function makeMockAccountBridge(
  _opts?: Opts
): AccountBridge<Transaction> {
  const createTransaction = (account: Account): Transaction => {
    switch (account.currency.family) {
      case "bitcoin":
        return {
          family: account.currency.family,
          amount: BigNumber(0),
          recipient: "",
          feePerByte: BigNumber(10),
          networkInfo: null,
          useAllAmount: false
        };

      case "ethereum":
        return {
          family: account.currency.family,
          amount: BigNumber(0),
          recipient: "",
          gasPrice: BigNumber(10000000000),
          gasLimit: BigNumber(21000),
          feeCustomUnit: getCryptoCurrencyById("ethereum").units[1],
          networkInfo: null,
          useAllAmount: false,
          tokenAccountId: null
        };

      case "ripple":
        return {
          family: account.currency.family,
          amount: BigNumber(0),
          recipient: "",
          fee: BigNumber(10),
          feeCustomUnit: getCryptoCurrencyById("ethereum").units[1],
          tag: undefined,
          networkInfo: null,
          useAllAmount: false
        };

      default:
        throw new Error(
          "mock bridge does not support currency family " +
            account.currency.family
        );
    }
  };

  const getTransactionStatus = (a, t) => {
    const tokenAccount = !t.tokenAccountId
      ? null
      : a.tokenAccounts &&
        a.tokenAccounts.find(ta => ta.id === t.tokenAccountId);
    const account = tokenAccount || a;

    const denySameDestination = a.currency.family === "ripple";

    const minimalBaseAmount =
      a.currency.family === "ripple"
        ? 10 ** a.currency.units[0].magnitude * 20
        : 0;

    const useAllAmount = !!t.useAllAmount;

    const estimatedFees = defaultGetFees(a, t);

    const totalSpent = useAllAmount
      ? account.balance
      : tokenAccount
      ? BigNumber(t.amount)
      : BigNumber(t.amount).plus(estimatedFees);

    const amount = useAllAmount
      ? tokenAccount
        ? BigNumber(t.amount)
        : account.balance.minus(estimatedFees)
      : BigNumber(t.amount);

    const showFeeWarning = tokenAccount
      ? false
      : amount.gt(0) && estimatedFees.times(10).gt(amount);

    // Fill up transaction errors...
    let transactionError;
    if (totalSpent.gt(account.balance)) {
      transactionError = new NotEnoughBalance();
    } else if (
      minimalBaseAmount &&
      account.balance.minus(totalSpent).lt(minimalBaseAmount)
    ) {
      // minimal amount not respected
      transactionError = new NotEnoughBalance();
    } else if (
      minimalBaseAmount &&
      t.recipient.includes("new") &&
      amount.lt(minimalBaseAmount)
    ) {
      // mimic XRP base minimal for new addresses
      transactionError = new NotEnoughBalanceBecauseDestinationNotCreated(
        null,
        {
          minimalAmount: `XRP Minimum reserve`
        }
      );
    }

    // Fill up recipient errors...
    let recipientError;
    let recipientWarning;
    if (t.recipient.length <= 3) {
      recipientError = new Error("invalid recipient");
    } else if (denySameDestination && a.freshAddress === t.recipient) {
      recipientError = new InvalidAddressBecauseDestinationIsAlsoSource();
    }

    return Promise.resolve({
      transactionError,
      recipientError,
      recipientWarning,
      showFeeWarning,
      estimatedFees,
      amount,
      totalSpent,
      useAllAmount
    });
  };

  const prepareTransaction = async (a, t) => {
    // TODO it needs to set the fee if not in t as well
    if (!t.networkInfo) {
      switch (t.family) {
        case "ripple":
          return {
            ...t,
            networkInfo: {
              serverFee: BigNumber(10),
              baseReserve: BigNumber(20)
            }
          };

        case "ethereum":
          const { gas_price } = await getEstimatedFees(a.currency);
          return {
            ...t,
            networkInfo: { gas_price }
          };

        case "bitcoin":
          const feeItems = await getFeeItems(a.currency);
          return {
            ...t,
            networkInfo: { feeItems }
          };
      }
    }
    return t;
  };

  const broadcasted: { [_: string]: Operation[] } = {};

  const syncTimeouts = {};

  const startSync = (initialAccount, observation) =>
    Observable.create(o => {
      const accountId = initialAccount.id;

      const sync = () => {
        if (initialAccount.name.includes("crash")) {
          o.error(new SyncError("mock failure"));
          return;
        }
        const ops = broadcasted[accountId] || [];
        broadcasted[accountId] = [];
        o.next(acc => {
          const account = { ...acc };
          account.lastSyncDate = new Date();
          account.blockHeight++;
          for (const op of ops) {
            account.balance = account.balance.plus(
              getOperationAmountNumber(op)
            );
            account.operations = ops.concat(
              account.operations.slice(0).reverse()
            );
            account.pendingOperations = [];
          }
          return account;
        });
        if (observation) {
          syncTimeouts[accountId] = setTimeout(sync, 20000);
        } else {
          o.complete();
        }
      };

      syncTimeouts[accountId] = setTimeout(sync, 2000);

      return () => {
        clearTimeout(syncTimeouts[accountId]);
        syncTimeouts[accountId] = null;
      };
    });

  const signAndBroadcast = (account, t, _deviceId) =>
    Observable.create(o => {
      let timeout = setTimeout(() => {
        o.next({ type: "signed" });
        timeout = setTimeout(() => {
          const rng = new Prando();
          const op = genOperation(account, account, account.operations, rng);
          op.type = "OUT";
          op.value = t.amount;
          op.blockHash = null;
          op.blockHeight = null;
          op.senders = [account.freshAddress];
          op.recipients = [t.recipient];
          op.blockHeight = account.blockHeight;
          op.date = new Date();
          broadcasted[account.id] = (broadcasted[account.id] || []).concat(op);
          o.next({ type: "broadcasted", operation: { ...op } });
          o.complete();
        }, 3000);
      }, 3000);
      return () => {
        clearTimeout(timeout);
      };
    });

  return {
    createTransaction,
    getTransactionStatus,
    prepareTransaction,
    startSync,
    signAndBroadcast,
    ...inferDeprecatedMethods({
      name: "MockBridge",
      createTransaction,
      getTransactionStatus,
      prepareTransaction
    })
  };
}

export function makeMockCurrencyBridge(opts?: Opts): CurrencyBridge {
  const { scanAccountDeviceSuccessRate, transactionsSizeTarget } = {
    ...defaultOpts,
    ...opts
  };

  const substractOneYear = date =>
    new Date(new Date(date).setFullYear(new Date(date).getFullYear() - 1));

  const scanAccountsOnDevice = currency =>
    Observable.create(o => {
      let unsubscribed = false;
      async function job() {
        if (Math.random() > scanAccountDeviceSuccessRate) {
          await delay(1000);
          if (!unsubscribed) o.error(new SyncError("scan failed"));
          return;
        }
        const nbAccountToGen = 3;
        for (let i = 0; i < nbAccountToGen && !unsubscribed; i++) {
          const isLast = i === 2;
          await delay(500);
          const account = genAccount(`${MOCK_DATA_SEED}_${currency.id}_${i}`, {
            operationsSize: isLast ? 0 : transactionsSizeTarget,
            currency
          });
          account.unit = currency.units[0];
          account.index = i;
          account.operations = isLast
            ? []
            : account.operations.map(operation => ({
                ...operation,
                date: substractOneYear(operation.date)
              }));
          account.name = "";
          account.name = validateNameEdition(account);
          if (isLast) {
            account.balance = BigNumber(0);
          }

          if (!unsubscribed) o.next(account);
        }
        if (!unsubscribed) o.complete();
      }

      job();

      return () => {
        unsubscribed = true;
      };
    });

  return {
    scanAccountsOnDevice
  };
}
