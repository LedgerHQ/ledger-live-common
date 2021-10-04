import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import { FeeNotLoaded } from "@ledgerhq/errors";
import type { Transaction } from "./types";
import type { Account, Operation, SignOperationEvent } from "../../types";
import { open, close } from "../../hw";
import { encodeOperationId } from "../../operation";
import Elrond from "./hw-app-elrond";
import { buildTransaction } from "./js-buildTransaction";
import { getNonce, compareVersions } from "./logic";
import { findTokenById } from "@ledgerhq/cryptoassets";

const buildOptimisticOperation = (
  account: Account,
  transaction: Transaction,
  fee: BigNumber,
  signUsingHash: boolean
): Operation => {
  const type = "OUT";
  const value = new BigNumber(transaction.amount);
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
      signUsingHash,
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
  Observable.create((o) => {
    async function main() {
      const transport = await open(deviceId);

      try {
        if (!transaction.fees) {
          throw new FeeNotLoaded();
        }
        // Collect data for an ESDT transfer
        const { subAccounts } = account;
        if (subAccounts) {
          transaction.subAccountId = subAccounts[0].id;
        }
        const { subAccountId } = transaction;
        const tokenAccount = !subAccountId
          ? null
          : subAccounts && subAccounts.find((ta) => ta.id === subAccountId);

        const elrond = new Elrond(transport);
        await elrond.setAddress(account.freshAddressPath);

        if (tokenAccount) {
          const tokenIdentifier = tokenAccount.id.split('+')[1];
          const token = findTokenById(`${tokenIdentifier}`);
          const message: Buffer = await elrond.provideESDTInfo(token?.ticker || '', token?.id.split('/')[2] || '', token?.units[0].magnitude || 18, 'T', token?.ledgerSignature || '');
        }
        const { version } = await elrond.getAppConfiguration();
        const signUsingHash = compareVersions(version, "1.0.11") >= 0;

        const unsigned = await buildTransaction(
          account,
          tokenAccount,
          transaction,
          signUsingHash
        );

        console.log(unsigned);

        o.next({
          type: "device-signature-requested",
        });
        const r = await elrond.signTransaction(
          account.freshAddressPath,
          unsigned,
          signUsingHash
        );
        o.next({
          type: "device-signature-granted",
        });
        const operation = buildOptimisticOperation(
          account,
          transaction,
          transaction.fees ?? new BigNumber(0),
          signUsingHash
        );
        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature: r,
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
