// @flow
import { Observable, of, concat } from "rxjs";
import { scan, tap, catchError, map } from "rxjs/operators";
import { useEffect, useState } from "react";
import type { ConnectAppEvent, Input as ConnectAppInput } from "../connectApp";
import type { InitSwapInput } from "../../swap/types";
import type { Action, Device } from "./types";
import type { AccountLike, Transaction, Account } from "../../types";
import type { AppState } from "./app";
import { log } from "@ledgerhq/logs";
import { createAction as createAppAction } from "./app";

import type {
  Exchange,
  ExchangeRate,
  InitSwapResult,
  SwapRequestEvent,
} from "../../swap/types";
import { getAccountBridge } from "../../bridge";
import { getAccountCurrency, getMainAccount } from "../../account";
import { parseCurrencyUnit } from "../../currencies";

type State = {|
  initSwapResult: ?InitSwapResult,
  initSwapRequested: boolean,
  initSwapError: ?Error,
  isLoading: boolean,
  freezeReduxDevice: boolean,
|};

type InitSwapState = {|
  ...AppState,
  ...State,
|};

type InitSwapRequest = {
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  transaction: Transaction,
  account: ?AccountLike,
  parentAccount: ?Account,
};

type Result =
  | {
      initSwapResult: InitSwapResult,
    }
  | {
      initSwapError: Error,
    };

type InitSwapAction = Action<InitSwapRequest, InitSwapState, Result>;

const mapResult = ({ initSwapResult, initSwapError }: InitSwapState): ?Result =>
  initSwapResult
    ? { initSwapResult }
    : initSwapError
    ? { initSwapError }
    : null;

const initialState: State = {
  initSwapResult: null,
  initSwapError: null,
  initSwapRequested: false,
  isLoading: true,
  freezeReduxDevice: false,
};

const reducer = (state: any, e: SwapRequestEvent | { type: "init-swap" }) => {
  switch (e.type) {
    case "init-sell":
      return { ...state, freezeReduxDevice: true };
    case "init-sell-error":
      return {
        ...state,
        initSwapError: e.error,
        isLoading: false,
      };
    case "init-sell-get-transaction-id":
      return { ...state, initSwapRequested: true, isLoading: false };
    case "init-sell-result":
      return {
        ...state,
        initSwapResult: e.initSwapResult,
        isLoading: false,
      };
  }
  return state;
};

function useFrozenValue<T>(value: T, frozen: boolean): T {
  const [state, setState] = useState(value);
  useEffect(() => {
    if (!frozen) {
      setState(value);
    }
  }, [value, frozen]);
  return state;
}

export const createAction = (
  connectAppExec: (ConnectAppInput) => Observable<ConnectAppEvent>,
  getTransactionId: (InitSwapInput) => Observable<SwapRequestEvent>,
  checkSignatureAndPrepare: (CSAPInput) => Observable<CSAPEvent>,
  onTransactionId: (string) => void
): InitSwapAction => {
  const useHook = (
    reduxDevice: ?Device,
    initSwapRequest: InitSwapRequest
  ): InitSwapState => {
    const [state, setState] = useState(initialState);
    const [coinifyContext, setCoinifyContext] = useState(null);

    const reduxDeviceFrozen = useFrozenValue(
      reduxDevice,
      state.freezeReduxDevice
    );

    const appState = createAppAction(connectAppExec).useHook(
      reduxDeviceFrozen,
      {
        appName: "Exchange",
      }
    );

    const { device, opened } = appState;
    const { transaction, parentAccount, account } = initSwapRequest;

    useEffect(() => {
      if (!opened || !device) {
        setState(initialState);
        return;
      }

      const sub = concat(
        of({ type: "init-sell" }),
        getTransactionId({
          deviceId: device.deviceId,
        }).pipe(
          map((txId) => ({
            type: "init-sell-get-transaction-id",
            value: txId,
          }))
        )
      )
        .pipe(
          tap((e) => {
            if (e && e.type === "init-sell-get-transaction-id") {
              onTransactionId(e.value).then((context) => {
                const bridge = getAccountBridge(account, parentAccount);
                const t = bridge.createTransaction(account);
                const mainAccount = getMainAccount(account, parentAccount);
                const currency = getAccountCurrency(mainAccount);

                const transaction = bridge.updateTransaction(t, {
                  amount: parseCurrencyUnit(
                    currency.units[0],
                    context.inAmount.toString(10)
                  ),
                  recipient: context.transferIn.details.account,
                });

                console.log(
                  "HEYY: ",
                  { context, currency, mainAccount },
                  context.inAmount.toString(),
                  {
                    balance: mainAccount.balance.toString(10),
                  }
                );

                bridge
                  .prepareTransaction(mainAccount, transaction)
                  .then((preparedTx) => {
                    bridge
                      .getTransactionStatus(mainAccount, preparedTx)
                      .then((status) => {
                        setCoinifyContext({
                          context,
                          transaction: preparedTx,
                          status,
                        });
                      });
                  });
              });
            }
            log("actions-initSell-event", e.type, e);
          }),
          catchError((error) =>
            of({
              type: "init-swap-error",
              error,
            })
          ),
          scan(reducer, initialState)
        )
        .subscribe(setState);

      return () => {
        sub.unsubscribe();
      };
    }, [transaction, device, opened]);

    useEffect(() => {
      if (!coinifyContext) return;

      const { context, transaction, status } = coinifyContext;

      console.log("INIT SELL STATUS: ", status);

      const sub = checkSignatureAndPrepare({
        deviceId: device.deviceId,
        binaryPayload: context.providerSig.payload,
        receiver: context.transferIn.details.account,
        payloadSignature: context.providerSig.signature,
        account,
        transaction,
        status,
      })
        .pipe(
          map(() => ({
            type: "init-sell-result",
            initSwapResult: { transaction },
          }))
        )
        .pipe(
          tap((e) => {
            log("actions-initSell-event", e);
          }),
          catchError((error) =>
            of({
              type: "init-sell-error",
              error,
            })
          ),
          scan(reducer, initialState)
        )
        .subscribe(setState);

      return () => {
        sub.unsubscribe();
      };
    }, [coinifyContext, transaction, device, opened]);

    return {
      ...appState,
      ...state,
    };
  };

  return {
    useHook,
    mapResult,
  };
};
