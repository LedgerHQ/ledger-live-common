import type { Account, AccountLike, TokenAccount } from "../../types";
import type { Transaction } from "./types";
import BigNumber from "bignumber.js";
import { estimateTokenSpendableBalance } from "./api/web3";

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}: {
  account: AccountLike;
  parentAccount?: Account;
  transaction?: Transaction;
}): Promise<BigNumber> => {
  switch (account.type) {
    case "Account":
      return account.spendableBalance;
    case "TokenAccount":
      if (!parentAccount) {
        throw new Error("parent account required");
      }
      return tokenAccountSpendableBalance(
        account,
        parentAccount,
        transaction?.recipient
      );
  }

  throw new Error("not supported account type");
};

function tokenAccountSpendableBalance(
  tokenAcc: TokenAccount,
  mainAcc: Account,
  destAddress?: string
) {
  return estimateTokenSpendableBalance(
    mainAcc.freshAddress,
    tokenAcc.token.id,
    destAddress
  );
}

export default estimateMaxSpendable;
