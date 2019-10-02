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
  statusOnTransaction: ?Transaction,
  errorAccount: ?Error,
  errorPrepare: ?Error,
  errorStatus: ?Error
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
    errors: {},
    warnings: {},
    estimatedFees: BigNumber(0),
    amount: BigNumber(0),
    totalSpent: BigNumber(0),
    useAllAmount: false
  },
  statusOnTransaction: null,
  errorAccount: null,
  errorPrepare: null,
  errorStatus: null
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
      if (s.transaction === a.transaction) return s;
      return { ...s, transaction: a.transaction };

    case "onStatus":
      return {
        ...s,
        errorStatus: null,
        status: a.status,
        statusOnTransaction: a.statusOnTransaction
      };

    case "onStatusError":
      if (a.error === s.errorStatus) return s;
      return {
        ...s,
        errorStatus: a.error
      };

    case "onPrepare":
      if (a.transaction === s.transaction && !s.errorPrepare) {
        return s;
      }
      return {
        ...s,
        errorPrepare: null,
        transaction: a.transaction
      };

    case "onPrepareError":
      if (a.error === s.errorPrepare) return s;
      return {
        ...s,
        errorPrepare: a.error
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
      statusOnTransaction,
      errorAccount,
      errorPrepare,
      errorStatus
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
            dispatch({ type: "onPrepareError", error: e });
          }
        );
    }
    return () => {
      ignore = true;
    };
  }, [transaction, mainAccount, dispatch]);

  // FIXME maybe the two effects should be merged. prepre+status together to minimize re-render...
  // also worth considering if we should EQUALS on the status object to know if the whole thing worth a reflow. at the end it might minimize events to just the transaction changes.

  // always keep a status in sync
  useEffect(() => {
    let ignore = false;
    if (mainAccount && transaction) {
      Promise.resolve()
        .then(() => getAccountBridge(mainAccount, null))
        .then(bridge => bridge.getTransactionStatus(mainAccount, transaction))
        .then(
          s => {
            if (ignore) return;
            dispatch({
              type: "onStatus",
              status: s,
              statusOnTransaction: transaction
            });
          },
          e => {
            if (ignore) return;
            dispatch({ type: "onStatusError", error: e });
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
    bridgePending: transaction !== statusOnTransaction
  };
};
