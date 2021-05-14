// @flow
import { BigNumber } from "bignumber.js";

import type { Account } from "../../types";
import type { Transaction } from "./types";
import { FIXED_GAS_PRICE, FIXED_DEFAULT_GAS_LIMIT } from "./logic";

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
  // Todo call gas station to get a more accurate tx fee in the future
  let estimateFee = Math.ceil(FIXED_GAS_PRICE * FIXED_DEFAULT_GAS_LIMIT);
  return new BigNumber(estimateFee);
};

export default getEstimatedFees;
