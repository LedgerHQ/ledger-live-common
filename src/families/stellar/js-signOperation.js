// @flow

import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import Stellar from "@ledgerhq/hw-app-str";
import { FeeNotLoaded } from "@ledgerhq/errors";

import type { Account, Operation, SignOperationEvent } from "../../types";
import { encodeOperationId } from "../../operation";
import { open, close } from "../../hw";


import type { Transaction } from "./types";
import { buildTransaction } from "./js-buildTransaction";
//import { getSequence } from "./api"; TODO:
//import { checkRecipientExist } from "./libcore";

/*
async function signTransaction({
  account: { freshAddress, freshAddressPath, balance, id },
  transport,
  transaction,
  coreTransaction,
  coreAccount,
  isCancelled,
  onDeviceSignatureGranted,
  onDeviceSignatureRequested,
}) {
  // 0) Build payload to sign
  const serialized = await coreTransaction.toSignatureBase();
  onDeviceSignatureRequested();

  // 1) Sign on hardware
  const hwApp = new Stellar(transport);
  const { signature } = await hwApp.signTransaction(
    freshAddressPath,
    Buffer.from(serialized, "hex")
  );
  onDeviceSignatureGranted();

  if (isCancelled()) return;

  // 2) Add signature to tx
  await coreTransaction.putSignature(
    signature.toString("hex"),
    await coreTransaction.getSourceAccount()
  );
  if (isCancelled()) return;

  // 3) Build signed payload
  const hex = await coreTransaction.toRawTransaction();
  if (isCancelled()) return;

  // 4) Gather tx fields
  const recipients = [transaction.recipient];
  const senders = [freshAddress];
  const feesRaw = await coreTransaction.getFee();
  if (isCancelled()) return;
  const fee = await libcoreAmountToBigNumber(feesRaw);
  if (isCancelled()) return;

  const stellarLikeAccount = await coreAccount.asStellarLikeAccount();
  const transactionSequenceNumberRaw = await stellarLikeAccount.getSequence();
  const transactionSequenceNumber = await libcoreBigIntToBigNumber(transactionSequenceNumberRaw);

  const op = {
    id: `${id}--OUT`,
    hash: "",
    type: "OUT",
    value:
      transaction.useAllAmount && transaction.networkInfo
        ? balance.minus(transaction.networkInfo.baseReserve).minus(fee)
        : transaction.amount.plus(fee),
    fee,
    blockHash: null,
    blockHeight: null,
    senders,
    recipients,
    accountId: id,
    date: new Date(),
    // Warning: Javascript number is not precise
    transactionSequenceNumber: transactionSequenceNumber.plus(1).toNumber(),
    extra: {},
  };

  checkRecipientExist.clear(transaction.recipient);

  return {
    operation: op,
    expirationDate: null,
    signature: hex,
  };
}
//*/

// Placeholder, TODO: implement in api
async function getSequence(a: Account) {
  return 1;
}

const buildOptimisticOperation = async (
  account: Account,
  transaction: Transaction
): Operation => {
  
  // TODO: implement getSequence in api
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
    fee: transaction.fees, //transaction.fees ?? BigNumber(0)
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

      // TODO:
      
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

        // TODO: Use Stellar SDK to build payload to sign
        const unsignedPayload = unsigned;
        /*
        const payload = registry
          .createType("ExtrinsicPayload", unsigned, {
            version: unsigned.version,
          })
          .toU8a({ method: true });
        */

        // Sign by device
        const hwApp = new Stellar(transport);
        const { signature } = await hwApp.signTransaction(
          account.freshAddressPath,
          Buffer.from(unsignedPayload, "hex")
        );

        // TODO: Use Stellar SDK to build signed payload
        const signedPayload = signature;
        //const signed = await signExtrinsic(unsigned, r.signature, registry);

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

  /*
export default makeSignOperation<Transaction, CoreStellarLikeTransaction>({
  buildTransaction,
  signTransaction,
});
*/

export default signOperation;
