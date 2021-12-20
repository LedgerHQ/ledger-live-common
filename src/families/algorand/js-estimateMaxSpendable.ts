import { BigNumber } from "bignumber.js";
import type { Account, AccountLike } from "../../types";
import { getMainAccount } from "../../account";
import type { AlgorandTransaction } from "./types";
import { computeAlgoMaxSpendable } from "./logic";

export const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}: {
  account: AccountLike;
  parentAccount?: Account | null | undefined;
  transaction?: AlgorandTransaction | null | undefined;
}): Promise<BigNumber> => {
  const mainAccount = getMainAccount(account, parentAccount);
  const { algorandResources } = mainAccount;
  if (!algorandResources) {
    throw new Error("Algorand account expected");
  }

  const isTokenAccount = account.id && account.id === transaction?.subAccountId;

  if (isTokenAccount) {
    return account.balance;
  } else {
    const maxSpendable = computeAlgoMaxSpendable({
      accountBalance: mainAccount.balance,
      nbAccountAssets: algorandResources.nbAssets,
      mode: transaction?.mode || "send",
    });
    return transaction?.fees
      ? maxSpendable.minus(transaction?.fees)
      : maxSpendable;
  }
};
