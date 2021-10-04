import { useEffect } from "react";
import { Account, TokenAccount } from "../../../types";
import { BigNumber } from "bignumber.js";

// Pick a default source account if none are selected.
export const usePickDefaultAccount = (
  accounts: ((Account | TokenAccount) & { disabled?: boolean })[],
  fromAccount: Account | TokenAccount | null | undefined,
  setFromAccount: (account: Account | TokenAccount) => void
): void => {
  useEffect(() => {
    if (!fromAccount) {
      const possibleDefaults = accounts.reduce<
        [
          Account | TokenAccount | undefined | null,
          Account | TokenAccount | undefined | null,
          Account | TokenAccount | undefined | null
        ]
      >(
        (acc, account) => {
          if (account.disabled) return acc;
          if (
            // eventually needs a type guard because the "currency" property does not exist in TokenAccount
            account["currency"]?.id === "ethereum" &&
            (acc[0]?.balance ?? new BigNumber(-1)).lt(account.balance)
          ) {
            acc[0] = account;
          }
          if (
            // eventually needs a type guard because the "currency" property does not exist in TokenAccount
            account["currency"]?.id === "bitcoin" &&
            (acc[1]?.balance ?? new BigNumber(-1)).lt(account.balance)
          ) {
            acc[1] = account;
          }
          const maxFundsAccount = acc[2];
          if (!maxFundsAccount || maxFundsAccount.balance.lt(account.balance)) {
            acc[2] = account;
          }
          return acc;
        },
        [null, null, null]
      );
      const defaultAccount = possibleDefaults.find(Boolean);
      defaultAccount && setFromAccount(defaultAccount);
    }
  }, [accounts, fromAccount, setFromAccount]);
};
