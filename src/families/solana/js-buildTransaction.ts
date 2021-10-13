import type { Account } from "../../types";
import type { Transaction } from "./types";
import { addSignatureToTransaction, buildTransferTransaction } from "./api";
import { FeeNotLoaded } from "@ledgerhq/errors";

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildOnChainTransferTransaction = async (
  account: Account,
  transaction: Transaction
) => {
  const { recipient, useAllAmount } = transaction;

  if (transaction.fees === undefined || transaction.fees.lt(0)) {
    throw new FeeNotLoaded();
  }

  const tx = await buildTransferTransaction({
    fromAddress: account.freshAddress,
    toAddress: recipient,
    amount: useAllAmount
      ? account.balance.minus(transaction.fees)
      : transaction.amount,
  });

  return [
    tx.compileMessage().serialize(),
    (signature: Buffer) => {
      return addSignatureToTransaction({
        tx,
        address: account.freshAddress,
        signature,
      }).serialize();
    },
  ] as const;
};

export default buildOnChainTransferTransaction;
