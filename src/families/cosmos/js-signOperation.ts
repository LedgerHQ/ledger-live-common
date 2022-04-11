import {
  Account,
  Operation,
  OperationType,
  SignOperationEvent,
} from "../../types";
import type { Transaction } from "./types";
import { getAccount, getChainId } from "./api/Cosmos";
import { Observable } from "rxjs";
import { withDevice } from "../../hw/deviceAccess";
import { encodeOperationId } from "../../operation";
import Cosmos from "@ledgerhq/hw-app-cosmos";
import { AminoTypes } from "@cosmjs/stargate";
import { buildTransaction, postBuildTransaction } from "./js-buildTransaction";
import BigNumber from "bignumber.js";

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
        const hwApp = new Cosmos(transport);

        const { accountNumber, sequence } = await getAccount(
          account.freshAddress
        );

        const chainId = await getChainId();

        o.next({ type: "device-signature-requested" });

        const { publicKey } = await hwApp.getAddress(
          // is valid?
          account.freshAddresses[0].derivationPath,
          "cosmos",
          false
        );

        const pubkey = {
          typeUrl: "/cosmos.crypto.secp256k1.PubKey",
          value: new Uint8Array([
            ...new Uint8Array([10, 33]),
            ...new Uint8Array(Buffer.from(publicKey, "hex")),
          ]),
        };

        const unsignedPayload = await buildTransaction(account, transaction);

        const msgs = unsignedPayload.map((msg) => aminoTypes.toAmino(msg));

        // Note:
        // Cosmos Nano App sign data in Amino way only, not Protobuf.
        // This is a legacy outdated standard and a long-term blocking point.

        const message = {
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
        };

        const { signature } = await hwApp.sign(
          account.freshAddressPath,
          JSON.stringify(message)
        );
        // need to clarify, it seems that we have to
        // remove the 5 first bytes from "signature"

        const tx_bytes = await postBuildTransaction(
          account,
          transaction,
          pubkey,
          unsignedPayload,
          new Uint8Array(signature || new Buffer(""))
        );

        const signed = Buffer.from(tx_bytes).toString("hex");

        if (cancelled) {
          return;
        }

        o.next({ type: "device-signature-granted" });

        const hash = ""; // resolved at broadcast time
        const accountId = account.id;
        const fee = transaction.fees || new BigNumber(0);
        const extra = {};

        const type: OperationType =
          transaction.mode === "undelegate"
            ? "UNDELEGATE"
            : transaction.mode === "delegate"
            ? "DELEGATE"
            : transaction.mode === "redelegate"
            ? "REDELEGATE"
            : ["claimReward", "claimRewardCompound"].includes(transaction.mode)
            ? "REWARD"
            : "OUT";

        const senders: string[] = [];
        const recipients: string[] = [];

        if (transaction.mode === "send") {
          senders.push(account.freshAddress);
          recipients.push(transaction.recipient);
        }

        if (transaction.mode === "redelegate") {
          Object.assign(extra, {
            cosmosSourceValidator: transaction.cosmosSourceValidator,
          });
        }

        if (transaction.mode !== "send") {
          Object.assign(extra, {
            validators: transaction.validators,
          });
        }

        // build optimistic operation
        const operation: Operation = {
          id: encodeOperationId(accountId, hash, type),
          hash,
          type,
          value: transaction.useAllAmount
            ? account.spendableBalance
            : transaction.amount.plus(fee),
          fee,
          extra,
          blockHash: null,
          blockHeight: null,
          senders,
          recipients,
          accountId,
          date: new Date(),
          transactionSequenceNumber: sequence,
        };

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature: signed,
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
