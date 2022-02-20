import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import { Transaction } from "./types";
import {
  types as TyphonTypes,
  address as TyphonAddress,
} from "@stricahq/typhonjs";

import { buildTransaction } from "./js-buildTransaction";

/**
 * Create an empty transaction
 *
 * @returns {Transaction}
 */
export const createTransaction = (): Transaction => ({
  family: "cardano",
  mode: "send",
  amount: new BigNumber(0),
  recipient: "",
  useAllAmount: false,
  fees: new BigNumber(0),
});

/**
 * Apply patch to transaction
 *
 * @param {*} t
 * @param {*} patch
 */
export const updateTransaction = (
  t: Transaction,
  patch: Partial<Transaction>
): Transaction => ({ ...t, ...patch });

/**
 * Prepare transaction before checking status
 *
 * @param {Account} a
 * @param {Transaction} t
 */
export const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => {
  const transaction = await buildTransaction(a, t);

  const transactionFees = transaction.getFee();
  const transactionAmount = transaction
    .getOutputs()
    .filter(
      (o) =>
        !(o.address instanceof TyphonAddress.BaseAddress) ||
        !(o.address.paymentCredential.type === TyphonTypes.HashType.ADDRESS) ||
        o.address.paymentCredential.bipPath === undefined
    )
    .reduce((total, o) => total.plus(o.amount), new BigNumber(0));

  if (transactionFees.eq(t.fees || 0) && transactionAmount.eq(t.amount)) {
    return t;
  }

  return { ...t, fees: transactionFees, amount: transactionAmount };
};
