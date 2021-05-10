// @flow
import { BigNumber } from "bignumber.js";

import type { Account } from "../../types";
import type { Transaction } from "./types";

/**
 * Fetch the transaction fees for a transaction
 *
 * @param {Account} a
 * @param {Transaction} t
 */
const getEstimatedFees = async ({
  a,
  t,
}: {
  a: Account,
  t: Transaction,
}): Promise<BigNumber> => {
  return new BigNumber(6500);
};

export default getEstimatedFees;
