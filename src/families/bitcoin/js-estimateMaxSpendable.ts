import { BigNumber } from "bignumber.js";
import type { AccountLike, Account } from "../../types";
import type { Transaction } from "./types";
import { getMainAccount } from "../../account";
import { getWalletAccount } from "./wallet";

/**
 * Returns the maximum possible amount for transaction
 *
 * @param {Object} param - the account, parentAccount and transaction
 */
const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}: {
  account: AccountLike;
  parentAccount: Account | null | undefined;
  transaction: Transaction | null | undefined;
}): Promise<BigNumber> => {
  // TODO Need implementation in wallet-btc (LL-6959)
  /*
  const mainAccount = getMainAccount(account, parentAccount);
  const walletAccount = await getWalletAccount(mainAccount);
  const estimate = walletAccount.estimateAccountMaxSpendable(walletAccount);
  //*/
  return new BigNumber(account.balance);
};

export default estimateMaxSpendable;
