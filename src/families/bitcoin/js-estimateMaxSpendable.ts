import { BigNumber } from "bignumber.js";
import type { AccountLike, Account } from "../../types";
import type { Transaction } from "./types";
import { getMainAccount } from "../../account";
import wallet, { getWalletAccount } from "./wallet";

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
  const mainAccount = getMainAccount(account, parentAccount);
  const walletAccount = await getWalletAccount(mainAccount);

  const estimate = await wallet.estimateAccountMaxSpendable(
    walletAccount,
    transaction?.feePerByte?.toNumber() || 0 //!\ wallet-btc handles fees as JS number
  );

  return estimate;
};

export default estimateMaxSpendable;
