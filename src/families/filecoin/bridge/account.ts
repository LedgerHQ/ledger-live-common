import { CurrencyNotSupported } from "@ledgerhq/errors";
import { BigNumber } from "bignumber.js";
import Fil from "@zondax/ledger-filecoin";

import { makeAccountBridgeReceive, makeSync } from "../../../bridge/jsHelpers";
import {
  Account,
  AccountBridge,
  AccountLike,
  BroadcastFnSignature,
  SignOperationEvent,
  SignOperationFnSignature,
  TransactionStatus,
} from "../../../types";
import { Transaction } from "../types";
import { getAccountShape } from "./utils/utils";
import { fetchBalances } from "./utils/api";
import { getMainAccount } from "../../../account";
import { Observable } from "rxjs";
import { close, open } from "../../../hw";
import { toCBOR } from "./utils/serialize";
import { Operation } from "../../../types/operation";
import { isError } from "../utils";

const receive = makeAccountBridgeReceive();

const createTransaction = (account: Account): Transaction => ({
  family: "filecoin",
  amount: new BigNumber(0),
  method: 0,
  version: 0,
  gasPrice: new BigNumber(0),
  gasLimit: new BigNumber(0),
  gasFeeCap: new BigNumber(0),
  gasPremium: new BigNumber(0),
  recipient: "",
  useAllAmount: false,
});

const updateTransaction = (
  t: Transaction,
  patch: Transaction
): Transaction => ({ ...t, ...patch });

const getTransactionStatus = (a: Account): Promise<TransactionStatus> =>
  Promise.reject(
    new CurrencyNotSupported("filecoin currency not supported", {
      currencyName: a.currency.name,
    })
  );

const estimateMaxSpendable = async ({
  account,
  parentAccount,
}: {
  account: AccountLike;
  parentAccount?: Account | null | undefined;
  transaction?: Transaction | null | undefined;
}): Promise<BigNumber> => {
  const a = getMainAccount(account, parentAccount);
  const balances = await fetchBalances(a.freshAddresses[0].address);

  // FIXME Filecoin - Check if we have to minus some other value
  return new BigNumber(balances.spendable_balance);
};

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> =>
  Promise.resolve(t);

const sync = makeSync(getAccountShape);

const broadcast: BroadcastFnSignature = async () => {
  throw new Error("broadcast not implemented");
};

const signOperation: SignOperationFnSignature<Transaction> = ({
  account,
  deviceId,
  transaction,
}): Observable<SignOperationEvent> =>
  new Observable((o) => {
    async function main() {
      const { recipient, amount } = transaction;
      const { id: accountId, freshAddresses } = account;
      const [mainAddress] = freshAddresses;

      const transport = await open(deviceId);

      try {
        // FIXME Filecoin - Check if everything is ready to execute signing process over tx

        o.next({
          type: "device-signature-requested",
        });

        // Serialize tx
        const serializedTx = toCBOR(mainAddress.address, transaction);

        // Sign by device
        const filecoin = new Fil(transport);
        const result = await filecoin.sign(
          mainAddress.derivationPath,
          serializedTx
        );
        isError(result);

        o.next({
          type: "device-signature-granted",
        });

        const fee = new BigNumber(0); // FIXME Filecoin
        const value = amount.plus(fee);

        // resolved at broadcast time
        const txHash = "";

        // build signature on the correct format
        const signature = `0x${result.signature_compact.toString("hex")}`;

        const operation: Operation = {
          id: `${accountId}-${txHash}-OUT`,
          hash: txHash,
          type: "OUT",
          senders: [mainAddress.address],
          recipients: [recipient],
          accountId,
          value,
          fee,
          blockHash: null,
          blockHeight: null,
          date: new Date(),
          extra: {},
        };

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature,
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

export const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  estimateMaxSpendable,
  sync,
  receive,
  broadcast,
  signOperation,
};
