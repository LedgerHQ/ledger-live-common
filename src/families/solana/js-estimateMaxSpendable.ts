import type { Account, AccountLike } from "../../types";
import type { Transaction } from "./types";
import BigNumber from "bignumber.js";

const estimateMaxSpendable = async ({
  account,
}: {
  account: AccountLike;
  parentAccount?: Account;
  transaction?: Transaction;
}): Promise<BigNumber> => {
  switch (account.type) {
    case "Account":
    case "TokenAccount":
      return account.spendableBalance;
  }

  throw new Error("not supported account type");
};

export default estimateMaxSpendable;