// @flow

import { BigNumber } from "bignumber.js";
// $FlowFixMe not sure why this breaks in desktop side
import { useEffect, useReducer, useCallback, useRef } from "react";
import { log } from "@ledgerhq/logs";
import type {
  Transaction,
  TransactionStatus,
  Account,
  AccountLike,
} from "../types";
import { getAccountBridge } from ".";
import { getMainAccount } from "../account";
import { delay } from "../promise";

export type State = {
  account: ?AccountLike,
  parentAccount: ?Account,
  transaction: ?Transaction,
  status: TransactionStatus,
  statusOnTransaction: ?Transaction,
  errorAccount: ?Error,
  errorStatus: ?Error,
};

export type Result = {
  transaction: ?Transaction,
  setTransaction: (Transaction) => void,
  updateTransaction: (updater: (Transaction) => Transaction) => void,
  account: ?AccountLike,
  parentAccount: ?Account,
  setAccount: (AccountLike, ?Account) => void,
  status: TransactionStatus,
  bridgeError: ?Error,
  bridgePending: boolean,
};

const initial: State = {
  account: null,
  parentAccount: null,
  transaction: null,
  status: {
    errors: {},
    warnings: {},
    estimatedFees: BigNumber(0),
    amount: BigNumber(0),
    totalSpent: BigNumber(0),
  },
  statusOnTransaction: null,
  errorAccount: null,
  errorStatus: null,
};

const makeInit = (optionalInit: ?() => $Shape<State>) => (): State => {
  let s = initial;
  if (optionalInit) {
    const patch = optionalInit();
    const { account, parentAccount, transaction } = patch;
    if (account) {
      s = reducer(s, { type: "setAccount", account, parentAccount });
    }
    if (transaction) {
      s = reducer(s, { type: "setTransaction", transaction });
    }
  }
  return s;
};

const reducer = (s: State, a): State => {
  switch (a.type) {
    case "setAccount": {
      const { account, parentAccount } = a;
      try {
        const mainAccount = getMainAccount(account, parentAccount);
        const bridge = getAccountBridge(account, parentAccount);
        const subAccountId = account.type !== "Account" && account.id;
        let t = bridge.createTransaction(mainAccount);

        if (
          s.transaction &&
          s.transaction.mode &&
          s.transaction.mode !== t.mode
        ) {
          t = bridge.updateTransaction(t, {
            mode: s.transaction.mode,
          });
        }

        if (subAccountId) {
          t = { ...t, subAccountId };
        }
        return {
          ...initial,
          account,
          parentAccount,
          transaction: t,
        };
      } catch (e) {
        return {
          ...initial,
          account,
          parentAccount,
          errorAccount: e,
        };
      }
    }

    case "setTransaction":
      if (s.transaction === a.transaction) return s;
      return { ...s, transaction: a.transaction };

    case "updateTransaction": {
      if (!s.transaction) return s;
      const transaction = a.updater(s.transaction);
      if (s.transaction === transaction) return s;
      return { ...s, transaction };
    }

    case "onStatus":
      // if (a.transaction === s.transaction && !s.errorStatus) {
      //   return s;
      // }
      return {
        ...s,
        errorStatus: null,
        transaction: a.transaction,
        status: a.status,
        statusOnTransaction: a.transaction,
      };

    case "onStatusError":
      if (a.error === s.errorStatus) return s;
      return {
        ...s,
        errorStatus: a.error,
      };

    default:
      return s;
  }
};

const INITIAL_ERROR_RETRY_DELAY = 1000;
const ERROR_RETRY_DELAY_MULTIPLIER = 1.5;
const DEBOUNCE_STATUS_DELAY = 300;

const useBridgeTransaction = (optionalInit?: ?() => $Shape<State>): Result => {
  const [
    {
      account,
      parentAccount,
      transaction,
      status,
      statusOnTransaction,
      errorAccount,
      errorStatus,
    },
    dispatch,
    // $FlowFixMe for ledger-live-mobile older react/flow version
  ] = useReducer(reducer, undefined, makeInit(optionalInit));

  const setAccount = useCallback(
    (account, parentAccount) =>
      dispatch({ type: "setAccount", account, parentAccount }),
    [dispatch]
  );

  const setTransaction = useCallback(
    (transaction) => dispatch({ type: "setTransaction", transaction }),
    [dispatch]
  );

  const updateTransaction = useCallback(
    (updater) => dispatch({ type: "updateTransaction", updater }),
    [dispatch]
  );

  const mainAccount = account ? getMainAccount(account, parentAccount) : null;

  const errorDelay = useRef(INITIAL_ERROR_RETRY_DELAY);
  const statusIsPending = useRef(false); // Stores if status already being processed

  const bridgePending = transaction !== statusOnTransaction;

  // when transaction changes, prepare the transaction
  useEffect(() => {
    let ignore = false;
    let errorTimeout;

    // If bridge is not pending, transaction change is due to
    // the last onStatus dispatch (prepareTransaction changed original transaction) and must be ignored
    if (!bridgePending) return;

    if (mainAccount && transaction) {
      // We don't debounce first status refresh, but any subsequent to avoid multiple calls
      // First call is immediate
      const debounce = statusIsPending.current
        ? delay(DEBOUNCE_STATUS_DELAY)
        : null;

      statusIsPending.current = true; // consider pending until status is resolved (error or success)

      Promise.resolve(debounce)
        .then(() => getAccountBridge(mainAccount, null))
        .then(async (bridge) => {
          if (ignore) return;
          const preparedTransaction = await bridge.prepareTransaction(
            mainAccount,
            transaction
          );
          if (ignore) return;
          const status = await bridge.getTransactionStatus(
            mainAccount,
            preparedTransaction
          );
          if (ignore) return;

          return {
            preparedTransaction,
            status,
          };
        })
        .then(
          (result) => {
            if (ignore || !result) return;
            const { preparedTransaction, status } = result;
            errorDelay.current = INITIAL_ERROR_RETRY_DELAY; // reset delay
            statusIsPending.current = false; // status is now synced with transaction

            dispatch({
              type: "onStatus",
              status,
              transaction: preparedTransaction,
            });
          },
          (e) => {
            if (ignore) return;
            statusIsPending.current = false;

            dispatch({ type: "onStatusError", error: e });
            log(
              "useBridgeTransaction",
              "prepareTransaction failed " + String(e)
            );
            // After X seconds of hanging in this error case, we try again
            log("useBridgeTransaction", "retrying prepareTransaction...");
            errorTimeout = setTimeout(() => {
              // $FlowFixMe (mobile)
              errorDelay.current *= ERROR_RETRY_DELAY_MULTIPLIER; // increase delay
              // $FlowFixMe
              const transactionCopy: Transaction = { ...transaction };
              dispatch({
                type: "setTransaction",
                transaction: transactionCopy,
              });
              // $FlowFixMe (mobile)
            }, errorDelay.current);
          }
        );
    }
    return () => {
      ignore = true;
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
    };
  }, [transaction, mainAccount, bridgePending, dispatch]);

  return {
    transaction,
    setTransaction,
    updateTransaction,
    status,
    account,
    parentAccount,
    setAccount,
    bridgeError: errorAccount || errorStatus,
    bridgePending,
  };
};

export default useBridgeTransaction;
