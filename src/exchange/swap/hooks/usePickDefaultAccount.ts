import { useEffect } from "react";
import { Account, TokenAccount } from "../../../types";

// Pick a default source account if none are selected.
export const usePickDefaultAccount = (
  accounts: ((Account | TokenAccount) & { disabled?: boolean })[],
  fromAccount: Account | TokenAccount | null | undefined,
  setFromAccount: (account: Account | TokenAccount) => void
): void => {
  useEffect(() => {
    if (!fromAccount) {
      const defaultAccount: Account | TokenAccount | undefined = accounts
        .filter((account) => !account.disabled && account.balance.gt(0))
        .sort((a, b) => a.balance.minus(b.balance).toNumber())
        .find(Boolean);

      if (defaultAccount) setFromAccount(defaultAccount);
    }
  }, [accounts, fromAccount, setFromAccount]);
};
