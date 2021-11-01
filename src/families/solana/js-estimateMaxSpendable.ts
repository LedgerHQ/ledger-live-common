import { getMainAccount } from "../../account";
import type { Account, AccountLike } from "../../types";
import type { Transaction } from "./types";
import BigNumber from "bignumber.js";

const estimateMaxSpendable = async ({
  account,
  parentAccount,
}: {
  account: AccountLike;
  parentAccount?: Account;
  transaction?: Transaction;
}): Promise<BigNumber> => {
  // TODO: fix for token accs
  //const mainAccount = getMainAccount(account, parentAccount);

  if (account.type === "Account" || account.type === "TokenAccount") {
    return account.spendableBalance;
  }

  throw Error("not supported account type");
  //return mainAccount.spendableBalance;
};

export default estimateMaxSpendable;
