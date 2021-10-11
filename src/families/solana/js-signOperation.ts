import { Observable } from "rxjs";
import type { Account, Operation, SignOperationEvent } from "../../types";
import { open, close } from "../../hw";
import type { Transaction } from "./types";
import { buildOnChainTransaction } from "./js-buildTransaction";
import Solana from "@ledgerhq/hw-app-solana";

const buildOptimisticOperation = async (
    account: Account,
    transaction: Transaction
): Promise<Operation> => {
    return {
        id: `${account.id}--OUT`,
        hash: "",
        accountId: account.id,
        type: "OUT",
        fee: transaction.fees,
        senders: [account.freshAddress],
        recipients: [transaction.recipient],
        date: new Date(),
        value: transaction.amount.plus(transaction.fees),
        blockHash: null,
        blockHeight: null,
        extra: {},
    };
    /*
    const transactionSequenceNumber = await fetchSequence(account);
    const fees = transaction.fees ?? new BigNumber(0);
    const operation: Operation = {
        id: `${account.id}--OUT`,
        hash: "",
        type: "OUT",
        value:
            transaction.useAllAmount && transaction.networkInfo
                ? account.balance
                      .minus(transaction.networkInfo.baseReserve)
                      .minus(fees)
                : transaction.amount.plus(fees),
        fee: fees,
        blockHash: null,
        blockHeight: null,
        senders: [account.freshAddress],
        recipients: [transaction.recipient],
        accountId: account.id,
        date: new Date(),
        // FIXME: Javascript number may be not precise enough
        transactionSequenceNumber: transactionSequenceNumber
            ?.plus(1)
            .toNumber(),
        extra: {},
    };
    return operation;
    */
};

/**
 * Sign Transaction with Ledger hardware
 */
const signOperation = ({
    account,
    deviceId,
    transaction,
}: {
    account: Account;
    deviceId: any;
    transaction: Transaction;
}): Observable<SignOperationEvent> =>
    new Observable((subsriber) => {
        const main = async () => {
            const transport = await open(deviceId);

            try {
                const [unsignedOnChainTxBytes, singOnChainTransaction] =
                    buildOnChainTransaction(account, transaction);

                const hwApp = new Solana(transport);

                subsriber.next({
                    type: "device-signature-requested",
                });

                const { signature } = await hwApp.signTransaction(
                    account.freshAddressPath,
                    unsignedOnChainTxBytes
                );

                subsriber.next({
                    type: "device-signature-granted",
                });

                const singedOnChainTxBytes = singOnChainTransaction(signature);

                subsriber.next({
                    type: "signed",
                    signedOperation: {
                        operation: await buildOptimisticOperation(
                            account,
                            transaction
                        ),
                        signature: singedOnChainTxBytes.toString("hex"),
                        expirationDate: null,
                    },
                });
            } finally {
                close(transport, deviceId);
            }
        };

        main().then(
            () => subsriber.complete(),
            (e) => subsriber.error(e)
        );
    });

/*
Observable.create((o) => {
    async function main() {
        const transport = await open(deviceId);

        try {
            o.next({
                type: "device-signature-requested",
            });

            // Fees are loaded during prepareTransaction
            if (!transaction.fees) {
                throw new FeeNotLoaded();
            }

            const unsigned = await buildOnChainTransaction(
                account,
                transaction
            );
            const unsignedPayload = unsigned.signatureBase();
            // Sign by device
            const hwApp = new Stellar(transport);
            const { signature } = await hwApp.signTransaction(
                account.freshAddressPath,
                unsignedPayload
            );
            unsigned.addSignature(
                account.freshAddress,
                signature.toString("base64")
            );
            o.next({
                type: "device-signature-granted",
            });
            const operation = await buildOptimisticOperation(
                account,
                transaction
            );
            o.next({
                type: "signed",
                signedOperation: {
                    operation,
                    signature: unsigned.toXDR(),
                    expirationDate: null,
                },
            });
        } finally {
            close(transport, deviceId);
        }
    }

    main().then(
        () => o.complete(),
        (e) => o.error(e)
    );
});
*/

export default signOperation;
