import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import { getFees } from "./api";

/**
 * Fetch the transaction fees for a transaction
 *
 * @param {Account} a
 * @param {Transaction} t
 */
const getEstimatedFees = async ({
  a,
  t,
  signUsingHash = true,
}: {
  a: Account;
  t: Transaction;
  signUsingHash: boolean | undefined;
}): Promise<BigNumber> => {
  return await getFees(t.data);
};

export default getEstimatedFees;
