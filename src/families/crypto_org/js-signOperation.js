// @flow
import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import { FeeNotLoaded } from "@ledgerhq/errors";
import {
  CryptoOrgWrongSignatureHeader,
  CryptoOrgSignatureSize,
} from "./errors";
import type { Transaction } from "./types";
import type { Account, Operation, SignOperationEvent } from "../../types";

import { open, close } from "../../hw";
import { encodeOperationId } from "../../operation";
import CryptoOrgApp from "@ledgerhq/hw-app-cosmos";
import { utils } from "@crypto-com/chain-jslib";

import { buildTransaction } from "./js-buildTransaction";
import { TESTNET_CURRENCY_ID } from "./logic";

const buildOptimisticOperation = (
  account: Account,
  transaction: Transaction,
  fee: BigNumber
): Operation => {
  const type = "OUT";

  const value = BigNumber(transaction.amount).plus(fee);

  const operation: $Exact<Operation> = {
    id: encodeOperationId(account.id, "", type),
    hash: "",
    type,
    value,
    fee,
    blockHash: null,
    blockHeight: null,
    senders: [account.freshAddress],
    recipients: [transaction.recipient].filter(Boolean),
    accountId: account.id,
    date: new Date(),
    extra: { additionalField: transaction.amount },
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

        if (!transaction.fees) {
          throw new FeeNotLoaded();
        }

        // Get the public key
        const hwApp = new CryptoOrgApp(transport);
        const address = account.freshAddresses[0];
        const useTestNet =
          account.currency.id == TESTNET_CURRENCY_ID ? true : false;
        const cointype = useTestNet ? "tcro" : "cro";
        const { publicKey } = await hwApp.getAddress(
          address.derivationPath,
          cointype,
          false
        );

        const unsigned = await buildTransaction(
          account,
          transaction,
          publicKey
        );

        // Sign by device
        const { signature } = await hwApp.sign(
          address.derivationPath,
          unsigned.toSignDocument(0).toUint8Array()
        );

        // Ledger has encoded the sig in ASN1 DER format, but we need a 64-byte buffer of <r,s>
        // DER-encoded signature from Ledger:
        // 0 0x30: a header byte indicating a compound structure
        // 1 A 1-byte length descriptor for all what follows (ignore)
        // 2 0x02: a header byte indicating an integer
        // 3 A 1-byte length descriptor for the R value
        // 4 The R coordinate, as a big-endian integer
        //   0x02: a header byte indicating an integer
        //   A 1-byte length descriptor for the S value
        //   The S coordinate, as a big-endian integer
        //  = 7 bytes of overhead
        if (signature[0] !== 0x30) {
          throw new CryptoOrgWrongSignatureHeader();
        }

        // decode DER string format
        let rOffset = 4;
        let rLen = signature[3];
        const sLen = signature[4 + rLen + 1]; // skip over following 0x02 type prefix for s
        let sOffset = signature.length - sLen;
        // we can safely ignore the first byte in the 33 bytes cases
        if (rLen === 33) {
          rOffset++; // chop off 0x00 padding
          rLen--;
        }
        if (sLen === 33) {
          sOffset++;
        } // as above
        const sigR = signature.slice(rOffset, rOffset + rLen); // skip e.g. 3045022100 and pad
        const sigS = signature.slice(sOffset);

        const signatureFormatted = Buffer.concat([sigR, sigS]);
        if (signatureFormatted.length !== 64) {
          throw new CryptoOrgSignatureSize();
        }

        const signed = unsigned
          .setSignature(
            0,
            utils.Bytes.fromUint8Array(new Uint8Array(signatureFormatted))
          )
          .toSigned()
          .getHexEncoded();

        o.next({ type: "device-signature-granted" });

        const operation = buildOptimisticOperation(
          account,
          transaction,
          transaction.fees ?? BigNumber(0)
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
