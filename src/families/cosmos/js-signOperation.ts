import { Account, SignOperationEvent } from "../../types";
import type { Transaction } from "./types";
import { getAccount, getChainId } from "./api/Cosmos";
import { Observable } from "rxjs";
import { withDevice } from "../../hw/deviceAccess";
import { Registry, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { encodeOperationId } from "../../operation";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { AminoTypes } from "@cosmjs/stargate";
import { stringToPath } from "@cosmjs/crypto";
import buildTransaction from "./js-buildTransaction";

const aminoTypes = new AminoTypes({ prefix: "cosmos" });

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
        const { accountNumber, sequence } = await getAccount(
          account.freshAddress
        );

        const chainId = await getChainId();

        const registry = new Registry();

        const hdPaths: any = stringToPath("m/" + account.freshAddressPath);

        const ledgerSigner = new LedgerSigner(transport, {
          hdPaths: [hdPaths],
        });

        o.next({ type: "device-signature-requested" });

        const unsignedPayload = await buildTransaction(account, transaction);

        const msgs = unsignedPayload.messages.map((msg) =>
          aminoTypes.toAmino(msg)
        );

        // Note:
        // We don't use Cosmos App,
        // Cosmos App support legacy StdTx and required to be ordered in a strict way,
        // Cosmos API expects a different sorting, resulting in a separate signature.
        // https://github.com/LedgerHQ/app-cosmos/blob/6c194daa28936e273f9548eabca9e72ba04bb632/app/src/tx_parser.c#L52

        const { signature } = await ledgerSigner.signAmino(
          account.freshAddress,
          {
            chain_id: chainId,
            account_number: accountNumber.toString(),
            sequence: sequence.toString(),
            fee: {
              amount: [
                {
                  denom: account.currency.units[1].code,
                  amount: transaction.fees?.toString() as string,
                },
              ],
              gas: transaction.gas?.toString() as string,
            },
            msgs: msgs,
            memo: transaction.memo || "",
          }
        );

        const txBodyFields: TxBodyEncodeObject = {
          typeUrl: "/cosmos.tx.v1beta1.TxBody",
          value: {
            messages: msgs.map((msg) => aminoTypes.fromAmino(msg)),
          },
        };

        const txBodyBytes = registry.encode(txBodyFields);

        const txRaw = TxRaw.fromPartial({
          bodyBytes: txBodyBytes,
          authInfoBytes: unsignedPayload.auth,
          signatures: [
            new Uint8Array(Buffer.from(signature.signature, "base64")),
          ],
        });

        const tx_bytes = Array.from(
          Uint8Array.from(TxRaw.encode(txRaw).finish())
        );

        if (cancelled) {
          return;
        }

        o.next({ type: "device-signature-granted" });

        // build optimistic operation
        const txHash = ""; // resolved at broadcast time
        const senders = [account.freshAddress];
        const recipients = [transaction.recipient];
        const accountId = account.id;

        const operation = {
          id: encodeOperationId(accountId, txHash, "OUT"),
          hash: txHash,
          type: "OUT",
          value: transaction.amount,
          fee: transaction.fees,
          extra: {
            storageLimit: 0,
            gasLimit: 0,
            tx_bytes: tx_bytes,
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
