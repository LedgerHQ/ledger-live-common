// @flow

import { Observable } from "rxjs";
import Stellar from "@ledgerhq/hw-app-str";
import { FeeNotLoaded } from "@ledgerhq/errors";

import type { Account, Operation, SignOperationEvent } from "../../types";
import { open, close } from "../../hw";

import type { Transaction } from "./types";
import { buildTransaction } from "./js-buildTransaction";
import { getSequence } from "./api";

const buildOptimisticOperation = async (
  account: Account,
  transaction: Transaction
): Operation => {
  
  const transactionSequenceNumber = await getSequence(account);

  // FIXME: DEBUG, TO BE REMOVED
  console.log("XXXXXX - signOperation - transaction.fees = " + transaction.fees);

  const operation: $Exact<Operation> = {
    id: `${id}--OUT`,
    hash: "",
    type: "OUT",
    value:
      transaction.useAllAmount && transaction.networkInfo
        ? balance.minus(transaction.networkInfo.baseReserve).minus(fee)
        : transaction.amount.plus(fee),
    fee: transaction.fees,
    blockHash: null,
    blockHeight: null,
    senders: [account.freshAddress],
    recipients: [transaction.recipient],
    accountId: id,
    date: new Date(),
    // FIXME: Javascript number may be not precise enough
    transactionSequenceNumber: transactionSequenceNumber.plus(1).toNumber(),
    extra: {},
  };

  return operation;
};

/**
 * Sign Transaction with Ledger hardware
 */
const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account,
  deviceId: *,
  transaction: Transaction,
}): Observable<SignOperationEvent> =>
  Observable.create((o) => {
    async function main() {

      const transport = await open(deviceId);
      try {
        o.next({ type: "device-signature-requested" });

        // Fees are loaded during prepareTransaction
        if (!transaction.fees) {
          throw new FeeNotLoaded();
        }

        // FIXME: DEBUG, TO BE REMOVED
        console.log("XXXXXX - signOperation - transaction.amount = " + transaction.amount);
        // FIXME: Is this needed? (cf. log above)
        /*
        // Ensure amount is filled when useAllAmount
        const transactionToSign = {
          ...transaction,
          amount: calculateAmount({ a: account, t: transaction }),
        };
        */

        const unsigned = await buildTransaction(
          account,
          transaction
        );

        // TODO: Use Stellar SDK to build unsigned payload
        const unsignedPayload = unsigned;

        // Sign by device
        const hwApp = new Stellar(transport);
        const { signature } = await hwApp.signTransaction(
          account.freshAddressPath,
          Buffer.from(unsignedPayload, "hex")
        );

        // TODO: Use Stellar SDK to build signed payload
        const signedPayload = signature;

        o.next({ type: "device-signature-granted" });

        const operation = buildOptimisticOperation(
          account,
          transaction
        );

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature: signed,
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

export default signOperation;
