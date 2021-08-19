import {
  InvalidAddressBecauseDestinationIsAlsoSource,
  RecipientRequired,
} from "@ledgerhq/errors";
import { BigNumber } from "bignumber.js";
import Fil from "@zondax/ledger-filecoin";
import { Observable } from "rxjs";

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
import { getAccountShape, getAddress } from "./utils/utils";
import { fetchBalances, fetchEstimatedFees } from "./utils/api";
import { getMainAccount } from "../../../account";
import { close, open } from "../../../hw";
import { toCBOR } from "./utils/serialize";
import { Operation } from "../../../types/operation";
import { getPath, isError } from "../utils";
import { log } from "@ledgerhq/logs";

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

const getTransactionStatus = async (
  a: Account,
  t: Transaction
): Promise<TransactionStatus> => {
  const errors: TransactionStatus["errors"] = {};
  const warnings: TransactionStatus["warnings"] = {};
  let estimatedFees = new BigNumber(0);
  let totalSpent = new BigNumber(0);

  log("getTransactionStatus", `${JSON.stringify(t)}`);
  const { address } = getAddress(a);
  const { recipient, amount } = t;

  if (!recipient) errors.recipient = new RecipientRequired("");
  else if (address === recipient)
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();

  if (!errors.recipient) {
    const result = await fetchEstimatedFees({ to: recipient, from: address });

    // FIXME Filecoin - Fix this operation
    estimatedFees = new BigNumber(result.gas_fee_cap).plus(
      new BigNumber(result.gas_premium)
    );

    // FIXME Filecoin - Fix this operation
    totalSpent = amount.plus(estimatedFees);
  }

  return {
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  };
};

const estimateMaxSpendable = async ({
  account,
  parentAccount,
}: {
  account: AccountLike;
  parentAccount?: Account | null | undefined;
  transaction?: Transaction | null | undefined;
}): Promise<BigNumber> => {
  const a = getMainAccount(account, parentAccount);
  const { address } = getAddress(a);
  const balances = await fetchBalances(address);

  // FIXME Filecoin - Check if we have to minus some other value
  return new BigNumber(balances.spendable_balance);
};

const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => t;

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
      const { id: accountId } = account;
      const { address, derivationPath } = getAddress(account);

      const transport = await open(deviceId);

      try {
        // FIXME Filecoin - Check if everything is ready to execute signing process over tx

        o.next({
          type: "device-signature-requested",
        });

        // Serialize tx
        const serializedTx = toCBOR(address, transaction);

        // Sign by device
        const filecoin = new Fil(transport);
        const result = await filecoin.sign(
          getPath(derivationPath),
          serializedTx
        );
        isError(result);

        o.next({
          type: "device-signature-granted",
        });

        const fee = new BigNumber(0); // FIXME Filecoin - Check how to calculate the fee
        const value = amount.plus(fee);

        // resolved at broadcast time
        const txHash = "";

        // build signature on the correct format
        const signature = `0x${result.signature_compact.toString("hex")}`;

        const operation: Operation = {
          id: `${accountId}-${txHash}-OUT`,
          hash: txHash,
          type: "OUT",
          senders: [address],
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
