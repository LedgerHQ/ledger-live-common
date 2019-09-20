// @flow

import { useEffect, useReducer, useCallback } from "react";
import type { Transaction, Account, AccountLike } from "../types";
import { getAccountBridge } from ".";
import { getMainAccount } from "../account";

const initial = {
  transaction: null,
  status: null,
  errorAccount: null,
  errorPrepare: null,
  errorStatus: null,
  pendingPrepare: false,
  pendingStatus: false
};

const reducer = (s, a) => {
  switch (a.type) {
    case "reset":
      return {
        ...initial,
        transaction: a.transaction || null,
        errorAccount: a.errorAccount || null
      };
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

export default ({
  account,
  parentAccount
}: {
  account: ?AccountLike,
  parentAccount: ?Account
}) => {
  const [
    {
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

  const setTransaction = useCallback(
    (transaction: Transaction) =>
      dispatch({ type: "setTransaction", transaction }),
    [dispatch]
  );

  const mainAccount = account ? getMainAccount(account, parentAccount) : null;

  // when account changes, regenerate the transaction
  useEffect(() => {
    if (account && mainAccount) {
      try {
        const bridge = getAccountBridge(mainAccount, null);
        const tokenAccountId = account.type === "TokenAccount" && account.id;
        let t = bridge.createTransaction(mainAccount);
        if (tokenAccountId) {
          t = { ...t, tokenAccountId };
        }
        dispatch({ type: "reset", transaction: t });
      } catch (e) {
        dispatch({ type: "reset", transaction: null, errorAccount: e });
      }
    } else {
      dispatch({ type: "reset" });
    }
  }, [account, mainAccount, dispatch]);

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

  return [
    transaction,
    setTransaction,
    status,
    errorAccount || errorPrepare || errorStatus,
    pendingPrepare || pendingStatus
  ];
};
