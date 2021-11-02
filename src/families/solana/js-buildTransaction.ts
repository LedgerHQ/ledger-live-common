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

  const { recipient, useAllAmount /*mode*/ } = transaction;

  if (transaction.subAccountId) {
    const tokenAcc = account.subAccounts?.find(
      (acc) => acc.id === transaction.subAccountId
    );

    if (!tokenAcc || tokenAcc.type !== "TokenAccount") {
      throw new Error("sub account not found");
    }
    return buildTokenTransferTransaction({
      fromAddress: account.freshAddress,
      toAddress: recipient,
      mintAddress: tokenAcc.token.id,
      amount: useAllAmount ? account.balance : transaction.amount,
      decimals: tokenAcc.token.units[0].magnitude,
      memo: transaction.memo,
    });
  }

  return buildTransferTransaction({
    fromAddress: account.freshAddress,
    toAddress: recipient,
    amount: useAllAmount
      ? account.balance.minus(transaction.fees)
      : transaction.amount,
    memo: transaction.memo,
  });
}

export default buildOnChainTransaction;
