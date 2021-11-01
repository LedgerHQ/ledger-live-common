import type { Account } from "../../types";
import type { Transaction } from "./types";
import { addSignatureToTransaction, buildTransferTransaction } from "./api";
import { FeeNotLoaded } from "@ledgerhq/errors";
import { buildTokenTransferTransaction } from "./api/web3";

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildOnChainTransaction = async (
  account: Account,
  transaction: Transaction
) => {
  const tx = await build(account, transaction);

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

function build(account: Account, transaction: Transaction) {
  if (transaction.fees === undefined || transaction.fees.lt(0)) {
    throw new FeeNotLoaded();
  }

  const { recipient, useAllAmount, mode } = transaction;

  switch (mode.kind) {
    case "native":
      return buildTransferTransaction({
        fromAddress: account.freshAddress,
        toAddress: recipient,
        amount: useAllAmount
          ? account.balance.minus(transaction.fees)
          : transaction.amount,
        memo: transaction.memo,
      });
    case "token":
      if (mode.spec.kind !== "prepared") {
        throw new Error("unprepared transaction");
      }
      return buildTokenTransferTransaction({
        fromAddress: account.freshAddress,
        toAddress: recipient,
        mintAddress: mode.spec.mintAddress,
        amount: useAllAmount ? account.balance : transaction.amount,
        decimals: mode.spec.decimals,
        memo: transaction.memo,
      });
    default:
      const _: never = mode;
      throw new Error("unsupported tx mode");
  }
}

export default buildOnChainTransaction;
