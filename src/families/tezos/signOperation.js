// @flow

import { Observable } from "rxjs";
import { LedgerSigner, DerivationType } from "@taquito/ledger-signer";
import { TezosToolkit } from "@taquito/taquito";
import type { Transaction } from "./types";
import type { Operation, Account, SignOperationEvent } from "../../types";
import { withDevice } from "../../hw/deviceAccess";
import { getEnv } from "../../env";

export const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account,
  deviceId: *,
  transaction: Transaction,
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) =>
    Observable.create((o) => {
      let cancelled;

      async function main() {
        const { freshAddressPath, freshAddress } = account;

        const tezos = new TezosToolkit(getEnv("API_TEZOS_NODE"));

        const ledgerSigner = new LedgerSigner(
          transport,
          freshAddressPath,
          false,
          DerivationType.ED25519
        );
        tezos.setProvider({ signer: ledgerSigner });

        let res, signature, opbytes;
        switch (transaction.mode) {
          case "send":
            tezos.contract.context.injector.inject = async () => ""; // disable broadcast
            res = await tezos.contract.transfer({
              to: transaction.recipient,
              amount: transaction.amount.div(10 ** 6),
              fee: transaction.fees,
              storageLimit: transaction.storageLimit,
              gasLimit: transaction.gasLimit,
            });
            signature = res.raw.opOb.signature;
            opbytes = res.raw.opbytes;
            break;
          case "delegate":
            res = await tezos.contract.setDelegate({
              delegate: transaction.recipient,
            });
            break;
          case "undelegate":
            // FIXME
            throw "not implemented yet";
          default:
            throw "not supported";
        }

        if (cancelled) {
          return;
        }

        o.next({ type: "device-signature-requested" });

        o.next({ type: "device-signature-granted" });

        // build optimistic operation
        const txHash = ""; // resolved at broadcast time
        const senders = [freshAddress];
        const recipients = [transaction.recipient];
        const accountId = account.id;

        // currently, all mode are always at least one OUT tx on ETH parent
        const operation: $Exact<Operation> = {
          id: `${accountId}-${txHash}-OUT`,
          hash: txHash,
          type: "OUT",
          value: transaction.amount,
          fee: transaction.fees,
          extra: {
            storageLimit: transaction.storageLimit,
            gasLimit: transaction.gasLimit,
            opbytes,
          },
          blockHash: null,
          blockHeight: null,
          senders,
          recipients,
          accountId,
          date: new Date(),
        };

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature,
            expirationDate: null,
          },
        });
      }

      main().then(
        () => o.complete(),
        (e) => (console.error("OOPSY", e), o.error(e))
      );

      return () => {
        cancelled = true;
      };
    })
  );
