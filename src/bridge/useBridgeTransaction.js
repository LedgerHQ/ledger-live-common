// @flow

import { BigNumber } from "bignumber.js";
import { useEffect, useReducer, useCallback } from "react";
import type {
  Transaction,
  TransactionStatus,
  Account,
  AccountLike
} from "../types";
import { getAccountBridge } from ".";
import { getMainAccount } from "../account";

export type State = {
  account: ?AccountLike,
  parentAccount: ?Account,
  transaction: ?Transaction,
  status: TransactionStatus,
  errorAccount: ?Error,
  errorPrepare: ?Error,
  errorStatus: ?Error,
  pendingPrepare: boolean,
  pendingStatus: boolean
};

export type Result = {
  transaction: ?Transaction,
  setTransaction: Transaction => void,
  account: ?AccountLike,
  parentAccount: ?Account,
  setAccount: (AccountLike, ?Account) => void,
  status: TransactionStatus,
  bridgeError: ?Error,
  bridgePending: boolean
};

const initial: State = {
  account: null,
  parentAccount: null,
  transaction: null,
  status: {
    transactionError: null,
    recipientError: null,
    recipientWarning: null,
    showFeeWarning: false,
    estimatedFees: BigNumber(0),
    amount: BigNumber(0),
    totalSpent: BigNumber(0),
    useAllAmount: false
  },
  errorAccount: null,
  errorPrepare: null,
  errorStatus: null,
  pendingPrepare: true,
  pendingStatus: true
};

const reducer = (s, a) => {
  switch (a.type) {
    case "setAccount":
      const { account, parentAccount } = a;
      try {
        const mainAccount = getMainAccount(account, parentAccount);
        const bridge = getAccountBridge(account, parentAccount);
        const subAccountId = account.type !== "Account" && account.id;
        let t = bridge.createTransaction(mainAccount);
        if (subAccountId) {
          t = { ...t, subAccountId };
        }
        return {
          ...initial,
          account,
          parentAccount,
          transaction: t
        };
      } catch (e) {
        return {
          ...initial,
          account,
          parentAccount,
          errorAccount: e
        };
      }

    case "setTransaction":
      return { ...s, transaction: a.transaction };

    case "onStatusStart":
      return { ...s, pendingStatus: true };

    case "onStatus":
      return {
        ...s,
        pendingStatus: false,
        errorStatus: a.error || null,
        status: a.status || s.status
      };

    case "onPrepareStart":
      return { ...s, pendingPrepare: true };

    case "onPrepare":
      return {
        ...s,
        pendingPrepare: false,
        errorPrepare: a.error || null,
        transaction: a.transaction || s.transaction
      };
    default:
      return s;
  }
};

export default (): Result => {
  const [
    {
      account,
      parentAccount,
      transaction,
      status,
      errorAccount,
      errorPrepare,
      errorStatus,
      pendingPrepare,
      pendingStatus
    },
    dispatch
  ] = useReducer(reducer, initial);

  const setAccount = useCallback(
    (account, parentAccount) =>
      dispatch({ type: "setAccount", account, parentAccount }),
    [dispatch]
  );

  const setTransaction = useCallback(
    transaction => dispatch({ type: "setTransaction", transaction }),
    [dispatch]
  );

  const mainAccount = account ? getMainAccount(account, parentAccount) : null;

  // when transaction changes, prepare the transaction
  useEffect(() => {
    let ignore = false;
    if (mainAccount && transaction) {
      dispatch({ type: "onPrepareStart" });
      Promise.resolve()
        .then(() => getAccountBridge(mainAccount, null))
        .then(bridge => bridge.prepareTransaction(mainAccount, transaction))
        .then(
          t => {
            if (ignore) return;
            dispatch({ type: "onPrepare", transaction: t });
          },
          e => {
            if (ignore) return;
            dispatch({ type: "onPrepare", error: e });
          }
        );
    }
    return () => {
      ignore = true;
    };
  }, [transaction, mainAccount, dispatch]);

  // always keep a status in sync
  useEffect(() => {
    let ignore = false;
    if (mainAccount && transaction) {
      dispatch({ type: "onStatusStart" });
      Promise.resolve()
        .then(() => getAccountBridge(mainAccount, null))
        .then(bridge => bridge.getTransactionStatus(mainAccount, transaction))
        .then(
          s => {
            if (ignore) return;
            dispatch({ type: "onStatus", status: s });
          },
          e => {
            if (ignore) return;
            dispatch({ type: "onStatus", error: e });
          }
        );
    }
    return () => {
      ignore = true;
    };
  }, [mainAccount, transaction, dispatch]);

  return {
    transaction,
    setTransaction,
    status,
    account,
    parentAccount,
    setAccount,
    bridgeError: errorAccount || errorPrepare || errorStatus,
    bridgePending: pendingPrepare || pendingStatus
  };
};
