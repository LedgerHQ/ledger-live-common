import { Observable } from "rxjs";
import type { Account, Operation, SignOperationEvent } from "../../types";
import { open, close } from "../../hw";
import type { Transaction } from "./types";
import { buildOnChainTransaction } from "./js-buildTransaction";
import Solana from "@ledgerhq/hw-app-solana";
import BigNumber from "bignumber.js";
import { encodeOperationId } from "../../operation";

const buildOptimisticOperation = async (
  account: Account,
  transaction: Transaction
): Promise<Operation> => {
  const fees = new BigNumber(0);
  const value = transaction.useAllAmount
    ? account.balance
    : transaction.amount.plus(fees);
  return {
    id: encodeOperationId(account.id, "", "OUT"),
    hash: "",
    accountId: account.id,
    type: "OUT",
    fee: fees,
    senders: [account.freshAddress],
    recipients: [transaction.recipient],
    date: new Date(),
    value,
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
          await buildOnChainTransaction(account, transaction);

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
            operation: await buildOptimisticOperation(account, transaction),
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
