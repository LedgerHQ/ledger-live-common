// @flow
import { BigNumber } from "bignumber.js";

import type { AccountLike, Account } from "../../types";
import { getMainAccount } from "../../account";

import type { Transaction } from "./types";
import { calculateAmount } from "./logic";
import { getFees } from "./cache";

import createTransaction from "./js-createTransaction";

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
  const a = getMainAccount(account, parentAccount);
  const t = {
    ...createTransaction(),
    ...transaction,
    useAllAmount: true,
  };

  const fees = await getFees({ a, t });

  return calculateAmount({ a, t: { ...t, fees } });
};

export default estimateMaxSpendable;
