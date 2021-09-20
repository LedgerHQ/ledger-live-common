import { useState, useReducer, useMemo, useEffect, useCallback } from "react";
import { BigNumber } from "bignumber.js";
import useBridgeTransaction, {
  Result as UseBridgeTransactionReturnType,
} from "../../../bridge/useBridgeTransaction";
import getExchangeRates from "../getExchangeRates";
import { getAccountBridge } from "../../../bridge";
import { getAbandonSeedAddress } from "../../../currencies";
import { getAccountCurrency, getMainAccount } from "../../../account";
import type {
  Account,
  TokenAccount,
  TokenCurrency,
  CryptoCurrency,
  AccountLike,
} from "../../../types";
import { ExchangeRate } from "../types";
import { AmountRequired } from "@ledgerhq/errors";
import { flattenAccounts } from "../../../account/helpers";
import { pickExchangeRate, getAccountTuplesForCurrency } from "../utils";

const ZERO = new BigNumber(0);

export type RatesReducerState = {
  status?: string | null;
  value?: ExchangeRate[];
  error?: Error;
};
export type SwapSelectorStateType = {
  currency: null | undefined | TokenCurrency | CryptoCurrency;
  account: null | undefined | Account | TokenAccount;
  parentAccount: null | undefined | Account;
  amount: null | undefined | BigNumber;
};
export type SwapDataType = {
  from: SwapSelectorStateType;
  to: SwapSelectorStateType;
  isMaxEnabled: boolean;
  isSwapReversable: boolean;
  rates: RatesReducerState;
  refetchRates: () => void;
  targetAccounts?: Account[];
};

const selectorStateDefaultValues = {
  currency: null,
  account: null,
  parentAccount: null,
  amount: null,
};

const ratesReducerInitialState: RatesReducerState = {};
const ratesReducer = (state: RatesReducerState, action): RatesReducerState => {
  switch (action.type) {
    case "set":
      return { value: action.payload };
    case "idle":
      return { ...state, status: null };
    case "loading":
      return { ...state, status: "loading" };
    case "error":
      return { status: "error", error: action.payload };
  }
  return state;
};

export type SwapTransactionType = UseBridgeTransactionReturnType & {
  swap: SwapDataType;
  setFromAccount: (account: SwapSelectorStateType["account"]) => void;
  setToAccount: (
    currency: SwapSelectorStateType["currency"],
    account: SwapSelectorStateType["account"],
    parentAccount: SwapSelectorStateType["parentAccount"]
  ) => void;
  setFromAmount: (amount: BigNumber) => void;
  setToAmount: (amount: BigNumber) => void;
  setToCurrency: (currency: SwapSelectorStateType["currency"]) => void;
  toggleMax: () => void;
  reverseSwap: () => void;
  fromAmountError?: Error;
};

export const useSwapTransaction = ({
  accounts,
  exchangeRate,
  setExchangeRate,
  defaultCurrency,
  defaultAccount,
  defaultParentAccount,
  onNoRates,
}: {
  accounts?: Account[];
  exchangeRate?: ExchangeRate;
  setExchangeRate?: (exchangeRate?: ExchangeRate | null) => void;
  defaultCurrency?: SwapSelectorStateType["currency"];
  defaultAccount?: SwapSelectorStateType["account"];
  defaultParentAccount?: SwapSelectorStateType["parentAccount"];
  onNoRates?: ({
    fromState,
    toState,
  }: {
    fromState: SwapSelectorStateType;
    toState: SwapSelectorStateType;
  }) => void;
} = {}): SwapTransactionType => {
  const [toState, setToState] = useState<SwapSelectorStateType>(
    selectorStateDefaultValues
  );
  const [fromState, setFromState] = useState<SwapSelectorStateType>({
    ...selectorStateDefaultValues,
    currency: defaultCurrency ?? selectorStateDefaultValues.currency,
    account: defaultAccount ?? selectorStateDefaultValues.account,
    parentAccount:
      defaultParentAccount ?? selectorStateDefaultValues.parentAccount,
  });
  const [isMaxEnabled, setMax] = useState<SwapDataType["isMaxEnabled"]>(false);
  const [rates, dispatchRates] = useReducer(
    ratesReducer,
    ratesReducerInitialState
  );
  const [getRatesDependency, setGetRatesDependency] = useState<unknown | null>(
    null
  );
  const refetchRates = useCallback(() => setGetRatesDependency({}), []);
  const bridgeTransaction = useBridgeTransaction(() => ({
    account: fromState.account,
    parentAccount: fromState.parentAccount,
  }));
  const {
    account: fromAccount,
    parentAccount: fromParentAccount,
    amount: fromAmount,
  } = fromState;
  const {
    account: toAccount,
    parentAccount: toParentAccount,
    currency: toCurrency,
  } = toState;
  const transaction = bridgeTransaction?.transaction;
  const fromAmountError = useMemo(() => {
    const [error] = [
      bridgeTransaction.status.errors?.gasPrice,
      bridgeTransaction.status.errors?.amount,
    ]
      .filter(Boolean)
      .filter((error) => !(error instanceof AmountRequired));

    return error;
  }, [
    bridgeTransaction.status.errors?.gasPrice,
    bridgeTransaction.status.errors?.amount,
  ]);
  const isSwapReversable = useMemo(() => {
    if (!toState.account || !fromState.currency) return false;

    const allAccounstWithSub = accounts ? flattenAccounts(accounts) : [];
    const isToSwappable = !!allAccounstWithSub.find(
      (account) => account.id === toState.account?.id
    );

    return isToSwappable;
  }, [toState.account, fromState.currency, accounts]);

  /* UPDATE from account */
  const setFromAccount: SwapTransactionType["setFromAccount"] = useCallback(
    (account) => {
      const parentAccount =
        account?.type !== "Account"
          ? accounts?.find((a) => a.id === account?.parentId)
          : null;
      const currency = getAccountCurrency(account as AccountLike);

      bridgeTransaction.setAccount(account as AccountLike, parentAccount);
      setFromState({
        ...selectorStateDefaultValues,
        currency,
        account,
        parentAccount,
      });

      /* @DEV: That populates fake seed. This is required to use Transaction object */
      const mainAccount = getMainAccount(account as AccountLike, parentAccount);
      const mainCurrency = getAccountCurrency(mainAccount);
      const recipient = getAbandonSeedAddress(mainCurrency.id);
      bridgeTransaction.updateTransaction((transaction) => ({
        ...transaction,
        recipient,
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, bridgeTransaction.updateTransaction]
  );

  /* UPDATE to accounts */
  const setToAccount: SwapTransactionType["setToAccount"] = useCallback(
    (currency, account, parentAccount) =>
      setToState({
        ...selectorStateDefaultValues,
        currency,
        account,
        parentAccount,
      }),
    []
  );

  /* Get the list of possible target accounts given the target currency. */
  const getTargetAccountsPairs = useCallback(
    (currency) =>
      currency &&
      accounts &&
      getAccountTuplesForCurrency(currency, accounts, false),
    [accounts]
  );
  const targetAccounts = useMemo(
    () =>
      getTargetAccountsPairs(toCurrency)?.map(
        ({ account, subAccount }) => subAccount || account
      ),
    [toCurrency, getTargetAccountsPairs]
  );

  const setToCurrency: SwapTransactionType["setToCurrency"] = useCallback(
    (currency) => {
      const targetAccountsPairs = getTargetAccountsPairs(currency);
      const accountPair = targetAccountsPairs && targetAccountsPairs[0];
      const account =
        accountPair && (accountPair.subAccount || accountPair.account);
      const parentAccount =
        accountPair && accountPair.subAccount && accountPair.account;

      setToState({
        ...selectorStateDefaultValues,
        currency,
        account,
        parentAccount,
      });
    },
    [getTargetAccountsPairs]
  );

  const setFromAmount: SwapTransactionType["setFromAmount"] = useCallback(
    (amount) => {
      bridgeTransaction.updateTransaction((transaction) => ({
        ...transaction,
        amount,
      }));
      setFromState((previousState) => ({ ...previousState, amount: amount }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bridgeTransaction.updateTransaction]
  );

  const setToAmount: SwapTransactionType["setToAmount"] = useCallback(
    (amount) =>
      setToState((previousState) => ({ ...previousState, amount: amount })),
    []
  );

  /* UPDATE from amount to the estimate max spendable on account
  change when the amount feature is enabled */
  useEffect(() => {
    const updateAmountUsingMax = async () => {
      if (!bridgeTransaction.account) return;
      const bridge = getAccountBridge(
        bridgeTransaction.account,
        bridgeTransaction.parentAccount
      );
      const amount = await bridge.estimateMaxSpendable({
        account: bridgeTransaction.account,
        parentAccount: bridgeTransaction.parentAccount,
        transaction: bridgeTransaction?.transaction,
      });
      setFromAmount(amount);
    };

    if (isMaxEnabled) {
      updateAmountUsingMax();
    }
  }, [
    setFromAmount,
    isMaxEnabled,
    fromState.account,
    bridgeTransaction?.transaction?.feesStrategy,
  ]);

  /* Fetch and update provider rates. */
  useEffect(() => {
    let abort = false;
    async function getRates() {
      if (
        !transaction ||
        !transaction?.amount ||
        !transaction?.amount.gt(0) ||
        !toAccount ||
        !fromAccount ||
        getAccountCurrency(toAccount) !== toCurrency
      ) {
        setExchangeRate && setExchangeRate(null);
        return dispatchRates({ type: "set", payload: [] });
      }
      dispatchRates({ type: "loading" });
      try {
        let rates: ExchangeRate[] = await getExchangeRates(
          { fromAccount, fromParentAccount, toAccount, toParentAccount },
          transaction
        );
        if (abort) return;
        if (rates.length === 0) {
          onNoRates && onNoRates({ fromState, toState });
        }
        // Discard bad provider rates
        let rateError: Error | null | undefined = null;
        rates = rates.reduce<ExchangeRate[]>((acc, rate) => {
          rateError = rateError ?? rate.error;
          return rate.error ? acc : [...acc, rate];
        }, []);
        if (rates.length === 0 && rateError) {
          // If all the rates are in error
          dispatchRates({ type: "error", payload: rateError });
        } else {
          dispatchRates({ type: "set", payload: rates });
          setExchangeRate &&
            exchangeRate &&
            pickExchangeRate(rates, exchangeRate, setExchangeRate);
        }
      } catch (error) {
        !abort && dispatchRates({ type: "error", payload: error });
      }
    }

    getRates();

    return () => {
      abort = true;
      dispatchRates({ type: "idle" });
    };
  }, [
    fromAccount,
    fromAmount,
    toAccount,
    transaction,
    getRatesDependency,
    onNoRates,
  ]);

  const toggleMax: SwapTransactionType["toggleMax"] = useCallback(
    () =>
      setMax((previous) => {
        if (previous) {
          setFromAmount(ZERO);
        }
        return !previous;
      }),
    [setFromAmount]
  );

  const reverseSwap: SwapTransactionType["reverseSwap"] = useCallback(() => {
    if (isSwapReversable === false) return;

    const [newTo, newFrom] = [fromState, toState];
    setFromAccount(newFrom.account);
    setToAccount(newTo.currency, newTo.account, newTo.parentAccount);
  }, [fromState, toState, setFromAccount, setToAccount, isSwapReversable]);

  const swap = {
    to: toState,
    from: fromState,
    isMaxEnabled,
    isSwapReversable,
    rates,
    refetchRates,
    targetAccounts,
  };

  return {
    ...bridgeTransaction,
    swap,
    setFromAmount,
    toggleMax,
    fromAmountError,
    setToAccount,
    setToCurrency,
    setFromAccount,
    setToAmount,
    reverseSwap,
  };
};
