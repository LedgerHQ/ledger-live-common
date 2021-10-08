import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import StellarSdk from "stellar-sdk";
import { AmountRequired, FeeNotLoaded, NetworkDown } from "@ledgerhq/errors";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import { addSignatureToTransaction } from "./api";
/*
import {
    buildPaymentOperation,
    buildCreateAccountOperation,
    buildTransactionBuilder,
    loadAccount,
} from "./api";
*/
//import { addressExists } from "./logic";
import { buildOnChainTransferTransaction } from "./api/web3";

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildOnChainTransaction = (
    account: Account,
    transaction: Transaction
) => {
    const { recipient, useAllAmount, recentBlockhash } = transaction;

    const tx = buildOnChainTransferTransaction({
        fromAddress: account.freshAddress,
        toAddress: recipient,
        amount: useAllAmount ? account.balance : transaction.amount,
        recentBlockhash,
    });

    return [
        tx.compileMessage().serialize(),
        (signature: Buffer) => {
            return addSignatureToTransaction({
                tx,
                address: account.freshAddress,
                signature,
            });
        },
    ] as const;

    /*
    if (!amount) throw new AmountRequired();
    const source = await loadAccount(account.freshAddress);
    if (!source) throw new NetworkDown();
    const transactionBuilder = buildTransactionBuilder(source, fees);
    let operation = null;
    const recipientExists = await addressExists(transaction.recipient); // TODO: use cache with checkRecipientExist instead?

    if (recipientExists) {
        operation = buildPaymentOperation(recipient, amount);
    } else {
        operation = buildCreateAccountOperation(recipient, amount);
    }

    transactionBuilder.addOperation(operation);
    let memo = null;

    if (memo) {
        transactionBuilder.addMemo(memo);
    }

    const built = transactionBuilder.setTimeout(0).build();
    return built;
    */
};

export default buildOnChainTransaction;
