import type { Account } from "../../types";
import type { NetworkInfo, Transaction } from "./types";
import { addSignatureToTransaction, buildTransferTransaction } from "./api";

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildOnChainTransferTransaction = (
    account: Account,
    transaction: Transaction & { networkInfo: NetworkInfo }
) => {
    const { recipient, useAllAmount, networkInfo } = transaction;

    const tx = buildTransferTransaction({
        fromAddress: account.freshAddress,
        toAddress: recipient,
        amount: useAllAmount ? account.balance : transaction.amount,
        recentBlockhash: networkInfo.recentBlockhash,
    });

    return [
        tx.compileMessage().serialize(),
        (signature: Buffer) => {
            return addSignatureToTransaction({
                tx,
                address: account.freshAddress,
                signature,
            })
                .compileMessage()
                .serialize();
        },
    ] as const;
};

export default buildOnChainTransferTransaction;
