import { Observable } from "rxjs";
import type { Account, Operation, SignOperationEvent } from "../../types";
import { open, close } from "../../hw";
import type { Transaction } from "./types";
import { buildOnChainTransferTransaction } from "./js-buildTransaction";
import Solana from "@ledgerhq/hw-app-solana";
import BigNumber from "bignumber.js";

const buildOptimisticOperation = async (
    account: Account,
    transaction: Transaction
): Promise<Operation> => {
    const fees = transaction.fees || new BigNumber(0);
    return {
        id: `${account.id}--OUT`,
        hash: "",
        accountId: account.id,
        type: "OUT",
        fee: fees,
        senders: [account.freshAddress],
        recipients: [transaction.recipient],
        date: new Date(),
        value: transaction.amount.plus(fees),
        blockHash: null,
        blockHeight: null,
        extra: {},
    };
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
                const [msgToHardwareBytes, singOnChainTransaction] =
                    await buildOnChainTransferTransaction(account, transaction);

                const hwApp = new Solana(transport);

                subsriber.next({
                    type: "device-signature-requested",
                });

                const { signature } = await hwApp.signTransaction(
                    account.freshAddressPath,
                    msgToHardwareBytes
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

export default signOperation;
