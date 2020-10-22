// @flow
import { Observable, of, concat } from "rxjs";
import { scan, tap, catchError } from "rxjs/operators";
import { useEffect, useState } from "react";
import type { ConnectAppEvent, Input as ConnectAppInput } from "../connectApp";
import type { Action, Device } from "./types";
import type {
  AccountLike,
  Transaction,
  TransactionStatus,
  Account,
} from "../../types";
import type { AppState } from "./app";
import { log } from "@ledgerhq/logs";
import { createAction as createAppAction } from "./app";
import type {
  InitSellResult,
  SellRequestEvent,
} from "../../exchange/sell/types";
import { getAccountBridge } from "../../bridge";
import { getAccountCurrency, getMainAccount } from "../../account";
import { parseCurrencyUnit } from "../../currencies";

type State = {|
  initSellResult: ?InitSellResult,
  initSellRequested: boolean,
  initSellError: ?Error,
  isLoading: boolean,
  freezeReduxDevice: boolean,
|};

type InitSellState = {|
  ...AppState,
  ...State,
|};

type InitSellRequest = {
  transaction: Transaction,
  account: AccountLike,
  parentAccount: ?Account,
};

type Result =
  | {
      initSellResult: InitSellResult,
    }
  | {
      initSellError: Error,
    };

type InitSellAction = Action<InitSellRequest, InitSellState, Result>;

const mapResult = ({ initSellResult, initSellError }: InitSellState): ?Result =>
  initSellResult
    ? { initSellResult }
    : initSellError
    ? { initSellError }
    : null;

const initialState: State = {
  initSellResult: null,
  initSellError: null,
  initSellRequested: false,
  isLoading: true,
  freezeReduxDevice: false,
};

const reducer = (state: any, e: SellRequestEvent | { type: "init-sell" }) => {
  switch (e.type) {
    case "init-sell":
      return { ...state, freezeReduxDevice: true };
    case "init-sell-error":
      return {
        ...state,
        initSellError: e.error,
        isLoading: false,
      };
    case "init-sell-get-transaction-id":
      return { ...state, initSellRequested: true, isLoading: false };
    case "init-sell-result":
      return {
        ...state,
        initSellResult: e.initSellResult,
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
  getTransactionId: ({ deviceId: string }) => Observable<SellRequestEvent>,
  checkSignatureAndPrepare: ({
    deviceId: string,
    binaryPayload: string,
    receiver: string,
    payloadSignature: string,
    account: AccountLike,
    transaction: Transaction,
    status: TransactionStatus,
  }) => Observable<SellRequestEvent>,
  onTransactionId: (string) => Promise<any> // FIXME define the type for the context?
): InitSellAction => {
  const useHook = (
    reduxDevice: ?Device,
    initSellRequest: InitSellRequest
  ): InitSellState => {
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
    const { transaction, parentAccount, account } = initSellRequest;

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
          tap((e: SellRequestEvent) => {
            if (e && e.type === "init-sell-get-transaction-id") {
              onTransactionId(e.value).then((context) => {
                // FIXME move this part to LLD/LLM
                const bridge = getAccountBridge(account, parentAccount);
                const mainAccount = getMainAccount(account, parentAccount);
                const t = bridge.createTransaction(mainAccount);
                const currency = getAccountCurrency(mainAccount);

                const transaction = bridge.updateTransaction(t, {
                  amount: parseCurrencyUnit(
                    currency.units[0],
                    context.inAmount.toString(10)
                  ),
                  recipient: context.transferIn.details.account,
                });

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
              type: "init-sell-error",
              error,
            })
          ),
          scan(reducer, initialState)
        )
      ).subscribe(setState);

      return () => {
        sub.unsubscribe();
      };
    }, [transaction, device, opened, account, parentAccount]);

    useEffect(() => {
      if (!coinifyContext || !device) return;
      const { context, transaction, status } = coinifyContext;

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
    }, [coinifyContext, transaction, device, opened, account]);

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
