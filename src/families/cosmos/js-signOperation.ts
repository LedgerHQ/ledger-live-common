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
import {
  encodePubkey,
  makeAuthInfoBytes,
  Registry,
  TxBodyEncodeObject,
} from "@cosmjs/proto-signing";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { encodeOperationId } from "../../operation";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { AminoTypes } from "@cosmjs/stargate";
import { stringToPath } from "@cosmjs/crypto";
import buildTransaction from "./js-buildTransaction";
import {
  MsgDelegate,
  MsgUndelegate,
  MsgBeginRedelegate,
} from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
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
        const { accountNumber, sequence } = await getAccount(
          account.freshAddress
        );

        const chainId = await getChainId();

        const registry = new Registry([
          ["/cosmos.staking.v1beta1.MsgDelegate", MsgDelegate],
          ["/cosmos.staking.v1beta1.MsgUndelegate", MsgUndelegate],
          ["/cosmos.staking.v1beta1.MsgBeginRedelegate", MsgBeginRedelegate],
          [
            "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
            MsgWithdrawDelegatorReward,
          ],
        ]);

        const hdPaths: any = stringToPath("m/" + account.freshAddressPath);

        const ledgerSigner = new LedgerSigner(transport, {
          hdPaths: [hdPaths],
        });

        o.next({ type: "device-signature-requested" });

        const accounts = await ledgerSigner.getAccounts();

        let pubkey;

        accounts.forEach((a) => {
          if (a.address == account.freshAddress) {
            pubkey = encodePubkey({
              type: "tendermint/PubKeySecp256k1",
              value: Buffer.from(a.pubkey).toString("base64"),
            });
          }
        });

        const unsignedPayload = await buildTransaction(account, transaction);

        const msgs = unsignedPayload.map((msg) => aminoTypes.toAmino(msg));

        // Note:
        // We don't use Cosmos App,
        // Cosmos App support legacy StdTx and required to be ordered in a strict way,
        // Cosmos API expects a different sorting, resulting in a separate signature.
        // https://github.com/LedgerHQ/app-cosmos/blob/6c194daa28936e273f9548eabca9e72ba04bb632/app/src/tx_parser.c#L52

        const signed = await ledgerSigner.signAmino(account.freshAddress, {
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
        });

        const txBodyFields: TxBodyEncodeObject = {
          typeUrl: "/cosmos.tx.v1beta1.TxBody",
          value: {
            messages: msgs.map((msg) => aminoTypes.fromAmino(msg)),
            memo: transaction.memo || "",
          },
        };

        const txBodyBytes = registry.encode(txBodyFields);

        const authInfoBytes = makeAuthInfoBytes(
          [{ pubkey, sequence }],
          [
            {
              amount:
                transaction.fees?.toString() || new BigNumber(2500).toString(),
              denom: account.currency.units[1].code,
            },
          ],
          transaction.gas?.toNumber() || new BigNumber(250000).toNumber(),
          SignMode.SIGN_MODE_LEGACY_AMINO_JSON
        );

        const txRaw = TxRaw.fromPartial({
          bodyBytes: txBodyBytes,
          authInfoBytes,
          signatures: [
            new Uint8Array(Buffer.from(signed.signature.signature, "base64")),
          ],
        });

        const signature = Buffer.from(TxRaw.encode(txRaw).finish()).toString(
          "hex"
        );

        if (cancelled) {
          return;
        }

        o.next({ type: "device-signature-granted" });

        const hash = ""; // resolved at broadcast time
        const accountId = account.id;
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

        const senders = [] as any;
        const recipients = [] as any;

        if (type === "OUT") {
          senders.push(account.freshAddress);
          recipients.push(transaction.recipient);
        }

        // build optimistic operation
        const operation: Operation = {
          id: encodeOperationId(accountId, hash, type),
          hash,
          type,
          value: transaction.amount,
          fee: transaction.fees || new BigNumber(0),
          extra: {},
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
