import type { Account } from "../../types";
import type { Transaction } from "./types";
import { addSignatureToTransaction, buildTransferTransaction } from "./api";

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildOnChainTransferTransaction = async (
    account: Account,
    transaction: Transaction
) => {
    const { recipient, useAllAmount } = transaction;

    const tx = await buildTransferTransaction({
        fromAddress: account.freshAddress,
        toAddress: recipient,
        amount: useAllAmount ? account.balance : transaction.amount,
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
