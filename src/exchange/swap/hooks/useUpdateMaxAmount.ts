import { useEffect } from "react";
import { getAccountBridge } from "../../../bridge";

import {
  SwapTransactionType,
  SwapDataType,
  SwapSelectorStateType,
} from "./useSwapTransaction";
import { Transaction } from "../../../generated/types";

/* UPDATE from amount to the estimate max spendable on account
change when the amount feature is enabled */
export const useUpdateMaxAmount = ({
  setFromAmount,
  isMaxEnabled,
  account,
  parentAccount,
  transaction,
  feesStrategy,
}: {
  setFromAmount: SwapTransactionType["setFromAmount"];
  isMaxEnabled: SwapDataType["isMaxEnabled"];
  account: SwapSelectorStateType["account"];
  parentAccount: SwapSelectorStateType["parentAccount"];
  transaction: SwapTransactionType["transaction"];
  feesStrategy: Transaction["feesStrategy"];
}): void => {
  useEffect(
    () => {
      const updateAmountUsingMax = async () => {
        if (!account) return;
        const bridge = getAccountBridge(account, parentAccount);
        const amount = await bridge.estimateMaxSpendable({
          account,
          parentAccount,
          transaction,
        });
        setFromAmount(amount);
      };

      if (isMaxEnabled) {
        updateAmountUsingMax();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setFromAmount, isMaxEnabled, account, parentAccount, feesStrategy]
  );
};
