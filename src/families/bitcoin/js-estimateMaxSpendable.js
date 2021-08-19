// @flow
import { BigNumber } from "bignumber.js";

import { getAbandonSeedAddress } from "@ledgerhq/cryptoassets";

import type { AccountLike, Account } from "../../types";
import type { Transaction } from "./types";
import { getMainAccount } from "../../account";

import createTransaction from "./js-createTransaction";
import prepareTransaction from "./js-prepareTransaction";
import getTransactionStatus from "./js-getTransactionStatus";

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
  account: AccountLike,
  parentAccount: ?Account,
  transaction: ?Transaction,
}): Promise<BigNumber> => {
  console.log("XXX - estimateMaxSpendable - START");
  const mainAccount = getMainAccount(account, parentAccount);
  const t = await prepareTransaction(mainAccount, {
    ...createTransaction(),
    ...transaction,
    recipient:
      // worse case scenario using a legacy address
      transaction?.recipient || getAbandonSeedAddress(mainAccount.currency.id),
    useAllAmount: true,
  });
  const s = await getTransactionStatus(mainAccount, t);
  console.log("XXX - estimateMaxSpendable - END");
  return s.amount;
};

export default estimateMaxSpendable;
