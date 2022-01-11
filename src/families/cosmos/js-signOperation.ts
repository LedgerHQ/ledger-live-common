import { Account, SignOperationEvent } from "../../types";
import type { Transaction } from "./types";
import { getAccount, getChainId } from "./api/Cosmos";
import { FeeNotLoaded } from "@ledgerhq/errors";
import { Observable } from "rxjs";
import { withDevice } from "../../hw/deviceAccess";
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
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { coins, makeSignDoc } from "@cosmjs/amino";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { AminoTypes } from "@cosmjs/stargate";
import { stringToPath } from "@cosmjs/crypto";

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

        const hdPaths: any = stringToPath("m/" + freshAddressPath);

        const ledgerSigner = new LedgerSigner(transport, {
          hdPaths: [hdPaths],
        });

        o.next({ type: "device-signature-requested" });

        let msg;

        switch (transaction.mode) {
          case "send":
            msg = [
              {
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
              },
            ];
            break;

          case "delegate":
            msg = [
              {
                typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
                value: {
                  delegatorAddress: freshAddress,
                  // todo:
                  // validatorAddress: transaction.validator,
                  amount: [
                    {
                      denom: "uatom",
                      amount: transaction.amount.toString(),
                    },
                  ],
                },
              },
            ];
            break;

          case "undelegate":
            msg = [
              {
                typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
                value: {
                  delegatorAddress: freshAddress,
                  // todo:
                  // validatorAddress: transaction.validator,
                  amount: [
                    {
                      denom: "uatom",
                      amount: transaction.amount.toString(),
                    },
                  ],
                },
              },
            ];
            break;

          default:
            throw "not supported";
        }

        const fee: Coin = {
          amount: transaction.fees?.toString() as string,
          denom: "uatom",
        };

        const authInfoBytes = makeAuthInfoBytes(
          [{ pubkey, sequence }],
          [fee],
          transaction.gas?.toNumber() as number,
          SignMode.SIGN_MODE_LEGACY_AMINO_JSON
        );

        const msgs = msg.map((msg) => aminoTypes.toAmino(msg));

        const signDoc = makeSignDoc(
          msgs,
          {
            amount: coins(transaction.fees?.toNumber() as number, "uatom"),
            gas: transaction.gas?.toString() as string,
          },
          chainId,
          transaction.memo || "",
          accountNumber,
          sequence
        );

        const { signed, signature } = await ledgerSigner.signAmino(
          freshAddress,
          signDoc
        );

        const txBodyFields: TxBodyEncodeObject = {
          typeUrl: "/cosmos.tx.v1beta1.TxBody",
          value: {
            messages: signed.msgs.map((msg) => aminoTypes.fromAmino(msg)),
          },
        };

        const txBodyBytes = registry.encode(txBodyFields);

        const txRaw = TxRaw.fromPartial({
          bodyBytes: txBodyBytes,
          authInfoBytes: authInfoBytes,
          signatures: [fromBase64(signature.signature)],
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
