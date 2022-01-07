import { Account, SignOperationEvent } from "../../types";
import type { Transaction } from "./types";
import { getAccount, getChainId } from "./api/Cosmos";
import { FeeNotLoaded } from "@ledgerhq/errors";
import { Observable } from "rxjs";
import { withDevice } from "../../hw/deviceAccess";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { makeCosmoshubPath } from "@cosmjs/amino";
import { log } from "@ledgerhq/logs";

const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account;
  deviceId: any;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) =>
    Observable.create((o) => {
      let cancelled;

      async function main() {
        const { fees } = transaction;
        if (!fees) throw new FeeNotLoaded();

        const { freshAddress } = account;

        const ledgerSigner = new LedgerSigner(transport, {
          // todo: handle path derivation
          hdPaths: [makeCosmoshubPath(0)],
        });

        o.next({ type: "device-signature-requested" });

        let msgs;
        switch (transaction.mode) {
          case "send":
            msgs = [
              {
                type: "cosmos-sdk/MsgSend",
                value: {
                  from_address: freshAddress,
                  to_address: transaction.recipient,
                  amount: [
                    {
                      denom: "atom",
                      amount: `${transaction.amount.div(1000000)}`,
                    },
                  ],
                },
              },
            ];

            break;

          case "delegate":
            msgs = [
              {
                type: "cosmos-sdk/MsgDelegate",
                value: {
                  amount: [
                    {
                      amount: `${transaction.amount.div(1000000)}`,
                      denom: "atom",
                    },
                  ],
                  delegator_address: freshAddress,
                  // todo:
                  // validator_address: transaction.validator_address,
                  validator_address: "",
                },
              },
            ];

            break;

          case "undelegate":
            // todo:
            msgs = [{}];

            break;

          default:
            throw "not supported";
        }

        const fee = {
          amount: [
            {
              amount: `${transaction.fees?.div(1000000)}`,
              denom: "atom",
            },
          ],
          gas: `${transaction.gas}`,
        };

        const { accountNumber, sequence } = await getAccount(freshAddress);
        const chainId = await getChainId();

        const unsigned = {
          chain_id: chainId,
          account_number: accountNumber,
          sequence: sequence,
          fee: fee,
          msgs: msgs,
          memo: transaction.memo || "",
        };

        const { signed, signature } = await ledgerSigner.signAmino(
          freshAddress,
          unsigned
        );

        log("info", "signed: ", signed);

        const tx = {
          chain_id: signed.chain_id,
          msg: signed.msgs,
          fee: signed.fee,
          signatures: [
            {
              pub_key: signature.pub_key,
              signature: signature.signature,
              sequence: signed.sequence,
              account_number: signed.account_number,
            },
          ],
          memo: signed.memo,
        };

        if (cancelled) {
          return;
        }

        o.next({ type: "device-signature-granted" });

        // build optimistic operation
        const txHash = ""; // resolved at broadcast time
        const senders = [freshAddress];
        const recipients = [transaction.recipient];
        const accountId = account.id;

        const operation = {
          id: encodeOperationId(accountId, txHash, "OUT"),
          hash: txHash,
          type: "OUT",
          value: transaction.amount,
          fee: fees,
          extra: {
            storageLimit: 0,
            gasLimit: 0,
            tx: tx,
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
        (e) => o.error(e)
      );

      return () => {
        cancelled = true;
      };
    })
  );

export default signOperation;
