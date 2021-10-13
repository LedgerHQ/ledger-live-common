import { getMainAccount } from "../../account";
import type { Account, AccountLike } from "../../types";
import type { Transaction } from "./types";
import BigNumber from "bignumber.js";

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}: {
  account: AccountLike;
  parentAccount?: Account;
  transaction?: Transaction;
}): Promise<BigNumber> => {
  const mainAccount = getMainAccount(account, parentAccount);
  return mainAccount.spendableBalance;
};

export default estimateMaxSpendable;
