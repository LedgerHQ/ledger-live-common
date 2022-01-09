import { Account, SignOperationEvent } from "../../types";
import type { Transaction } from "./types";
import { getAccount, getChainId } from "./api/Cosmos";
import { FeeNotLoaded } from "@ledgerhq/errors";
import { Observable } from "rxjs";
import { withDevice } from "../../hw/deviceAccess";
import CosmosApp from "@ledgerhq/hw-app-cosmos";
import {
  Coin,
  encodePubkey,
  makeAuthInfoBytes,
  Registry,
  TxBodyEncodeObject,
} from "@cosmjs/proto-signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { fromBase64, toBase64 } from "@cosmjs/encoding";
import { encodeOperationId } from "../../operation";

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

        const { freshAddress, freshAddressPath, seedIdentifier } = account;
        const { accountNumber, sequence } = await getAccount(freshAddress);
        const chainId = await getChainId();

        const pubkey = encodePubkey({
          type: "tendermint/PubKeySecp256k1",
          value: toBase64(Buffer.from(seedIdentifier, "hex")),
        });

        const registry = new Registry();

        o.next({ type: "device-signature-requested" });

        // Note:
        // Cosmos App don't support gRPC transactions, we need to send legacy transaction (StdTx instead of TxBody) to the device.
        // So, msg is the TxBody, and legacyMsg the StdTx.
        // Keep in mind legacyMsg must be ordered in a strict way.
        // https://github.com/cosmos/ledger-cosmos/blob/6c194daa28936e273f9548eabca9e72ba04bb632/app/src/tx_parser.c#L52

        let msg, legacyMsg;

        switch (transaction.mode) {
          case "send":
            msg = {
              typeUrl: "/cosmos.bank.v1beta1.MsgSend",
              value: {
                fromAddress: freshAddress,
                toAddress: transaction.recipient,
                amount: [
                  {
                    denom: "uatom",
                    amount: transaction.amount.toString(),
                  },
                ],
              },
            };

            legacyMsg = {
              type: "cosmos-sdk/MsgSend",
              value: {
                amount: [
                  {
                    amount: transaction.amount.toString(),
                    denom: "uatom",
                  },
                ],
                from_address: freshAddress,
                to_address: transaction.recipient,
              },
            };
            break;

          case "delegate":
            break;

          case "undelegate":
            break;

          default:
            throw "not supported";
        }

        const fee: Coin = {
          amount: transaction.fees?.toString() as string,
          denom: "uatom",
        };

        const txBodyFields: TxBodyEncodeObject = {
          typeUrl: "/cosmos.tx.v1beta1.TxBody",
          value: {
            messages: [msg],
          },
        };

        const txBodyBytes = registry.encode(txBodyFields);

        const authInfoBytes = makeAuthInfoBytes(
          [{ pubkey, sequence }],
          [fee],
          transaction.gas?.toNumber() || 0
        );

        const message = JSON.stringify({
          account_number: accountNumber,
          chain_id: chainId,
          fee: {
            amount: [
              {
                amount: transaction.amount.toString(),
                denom: "uatom",
              },
            ],
            gas: transaction.gas?.toNumber() || 0,
          },
          memo: transaction.memo || "",
          msgs: [legacyMsg],
          sequence: sequence,
        });

        const hwApp = new CosmosApp(transport);
        const { signature } = await hwApp.sign(freshAddressPath, message);

        if (!signature) {
          return;
        }

        const txRaw = TxRaw.fromPartial({
          bodyBytes: txBodyBytes,
          authInfoBytes: authInfoBytes,
          signatures: [fromBase64(signature.toString("base64"))],
        });

        const tx_bytes = Uint8Array.from(TxRaw.encode(txRaw).finish());

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
