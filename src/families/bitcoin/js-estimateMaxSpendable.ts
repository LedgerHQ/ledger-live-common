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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transaction,
}: {
  account: AccountLike;
  parentAccount: Account | null | undefined;
  transaction: Transaction | null | undefined;
}): Promise<BigNumber> => {
  const mainAccount = getMainAccount(account, parentAccount);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const walletAccount = await getWalletAccount(mainAccount);
  // TODO Need implementation in wallet-btc (LL-6959)
  // const estimate = wallet.estimateAccountMaxSpendable(walletAccount, transaction?.feePerByte || 0);
  return new BigNumber(account.balance);
};

export default estimateMaxSpendable;
