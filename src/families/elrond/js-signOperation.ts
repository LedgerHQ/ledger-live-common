import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import { FeeNotLoaded } from "@ledgerhq/errors";
import type { Transaction } from "./types";
import type { Account, Operation, SignOperationEvent } from "../../types";
import { withDevice } from "../../hw/deviceAccess";
import { encodeOperationId } from "../../operation";
import Elrond from "./hw-app-elrond";
import { buildTransaction } from "./js-buildTransaction";
import { getNonce } from "./logic";
import { findTokenById } from "@ledgerhq/cryptoassets";
import { CHAIN_ID } from "./constants";

const buildOptimisticOperation = (
  account: Account,
  transaction: Transaction,
  fee: BigNumber
): Operation => {
  const type = "OUT";
  const tokenAccount =
    (transaction.subAccountId &&
      account.subAccounts &&
      account.subAccounts.find((ta) => ta.id === transaction.subAccountId)) ||
    null;

  let value = transaction.useAllAmount
    ? account.balance.minus(fee)
    : new BigNumber(transaction.amount);

  if (tokenAccount) {
    value = transaction.amount;
  }

  const operation: Operation = {
    id: encodeOperationId(account.id, "", type),
    hash: "",
    type,
    value,
    fee,
    blockHash: null,
    blockHeight: account.blockHeight,
    senders: [account.freshAddress],
    recipients: [transaction.recipient].filter(Boolean),
    accountId: account.id,
    transactionSequenceNumber: getNonce(account),
    date: new Date(),
    extra: {
      data: transaction.data,
    },
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
  account: Account;
  deviceId: any;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) =>
    Observable.create((o) => {
      async function main() {
        if (!transaction.fees) {
          throw new FeeNotLoaded();
        }
        // Collect data for an ESDT transfer
        const { subAccounts } = account;
        const { subAccountId } = transaction;
        const tokenAccount = !subAccountId
          ? null
          : subAccounts && subAccounts.find((ta) => ta.id === subAccountId);

        const elrond = new Elrond(transport);
        await elrond.setAddress(account.freshAddressPath);

        if (tokenAccount) {
          const tokenIdentifier = tokenAccount.id.split("+")[1];
          const token = findTokenById(`${tokenIdentifier}`);

          if (token?.ticker && token.id && token.ledgerSignature) {
            const collectionIdentifierHex = token.id.split("/")[2];
            await elrond.provideESDTInfo(
              token.ticker,
              collectionIdentifierHex,
              token?.units[0].magnitude,
              CHAIN_ID,
              token.ledgerSignature
            );
          }
        }

        const unsignedTx: string = await buildTransaction(
          account,
          tokenAccount,
          transaction
        );

        o.next({
          type: "device-signature-requested",
        });

        const r = await elrond.signTransaction(
          account.freshAddressPath,
          unsignedTx,
          true
        );

        o.next({
          type: "device-signature-granted",
        });

        const operation = buildOptimisticOperation(
          account,
          transaction,
          transaction.fees ?? new BigNumber(0)
        );
        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature: r,
            expirationDate: null,
          },
        });
      }

      main().then(
        () => o.complete(),
        (e) => o.error(e)
      );
    })
  );

export default signOperation;
