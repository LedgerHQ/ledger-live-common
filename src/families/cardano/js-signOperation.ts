import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import { FeeNotLoaded } from "@ledgerhq/errors";

import type { Transaction } from "./types";
import type { Account, Operation, SignOperationEvent } from "../../types";

import { open, close } from "../../hw";
import { encodeOperationId } from "../../operation";

import { buildTransaction } from "./js-buildTransaction";

import Ada, {
  Networks,
  SignTransactionRequest,
  TransactionSigningMode,
  Witness,
} from "@cardano-foundation/ledgerjs-hw-app-cardano";
import {
  types as TyphonTypes,
  Transaction as TyphonTransaction,
} from "@stricahq/typhonjs";
import { Bip32PublicKey } from "@stricahq/bip32ed25519";
import {
  getExtendedPublicKeyFromHex,
  prepareLedgerInput,
  prepareLedgerOutput,
} from "./logic";
import { CARDANO_NETWORK_ID } from "./constants";

const buildOptimisticOperation = (
  account: Account,
  amount: BigNumber,
  transaction: TyphonTransaction
): Operation => {
  //TODO:CARDANO check for internal transaction type
  const type = "OUT";

  const value = new BigNumber(amount).plus(transaction.getFee());

  const operation: Operation = {
    id: encodeOperationId(account.id, "", type),
    hash: transaction.getTransactionHash().toString("hex"),
    type,
    value,
    fee: transaction.getFee(),
    blockHash: null,
    blockHeight: null,
    senders: transaction.getInputs().map((i) => i.address.getBech32()),
    recipients: transaction.getOutputs().map((o) => o.address.getBech32()),
    accountId: account.id,
    date: new Date(),
    extra: {},
  };

  return operation;
};

/**
 * Adds signatures to unsigned transaction
 */
const signTx = (
  unsignedTransaction: TyphonTransaction,
  accountKey: Bip32PublicKey,
  witnesses: Array<Witness>
) => {
  witnesses.forEach((witness) => {
    const [, , , chainType, index] = witness.path;
    const publicKey = accountKey
      .derive(chainType)
      .derive(index)
      .toPublicKey()
      .toBytes();
    const vKeyWitness: TyphonTypes.VKeyWitness = {
      signature: Buffer.from(witness.witnessSignatureHex, "hex"),
      publicKey: Buffer.from(publicKey),
    };
    unsignedTransaction.addWitness(vKeyWitness);
  });

  return unsignedTransaction.buildTransaction();
};

/**
 * Sign Transaction with Ledger hardware
 */
const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account;
  deviceId: string;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  new Observable((o) => {
    async function main() {
      const transport = await open(deviceId);
      try {
        o.next({ type: "device-signature-requested" });

        if (!transaction.fees) {
          throw new FeeNotLoaded();
        }

        const unsignedTransaction = await buildTransaction(
          account,
          transaction
        );

        const accountPubKey = getExtendedPublicKeyFromHex(
          account.xpub as string
        );

        const rawInputs = unsignedTransaction.getInputs();
        const ledgerAppInputs = rawInputs.map((i) =>
          prepareLedgerInput(i, account.index)
        );

        const rawOutptus = unsignedTransaction.getOutputs();
        const ledgerAppOutputs = rawOutptus.map((o) =>
          prepareLedgerOutput(o, account.index)
        );

        const trxOptions: SignTransactionRequest = {
          signingMode: TransactionSigningMode.ORDINARY_TRANSACTION,
          tx: {
            network:
              CARDANO_NETWORK_ID === Networks.Mainnet.networkId
                ? Networks.Mainnet
                : Networks.Testnet,
            inputs: ledgerAppInputs,
            outputs: ledgerAppOutputs,
            certificates: [],
            withdrawals: [],
            fee: unsignedTransaction.getFee().toString(),
            ttl: unsignedTransaction.getTTL()?.toString(),
            validityIntervalStart: null,
            auxiliaryData: null,
          },
          additionalWitnessPaths: [],
        };

        // Sign by device
        const appAda = new Ada(transport);
        const r = await appAda.signTransaction(trxOptions);
        const signed = signTx(unsignedTransaction, accountPubKey, r.witnesses);
        o.next({ type: "device-signature-granted" });

        const operation = buildOptimisticOperation(
          account,
          transaction.amount,
          unsignedTransaction
        );

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature: signed.payload,
            signatureRaw: signed,
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
