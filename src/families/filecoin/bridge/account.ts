import {
  AmountRequired,
  FeeNotLoaded,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
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
import { getAccountShape, getAddress, getTxToBroadcast } from "./utils/utils";
import { broadcastTx, fetchBalances, fetchEstimatedFees } from "./utils/api";
import { getMainAccount } from "../../../account";
import { close, open } from "../../../hw";
import { toCBOR } from "./utils/serializer";
import { Operation } from "../../../types/operation";
import { getPath, isError } from "../utils";
import { log } from "@ledgerhq/logs";
import { getAddressRaw, validateAddress } from "./utils/addresses";
import { patchOperationWithHash } from "../../../operation";
import { withDevice } from "../../../hw/deviceAccess";

const receive = makeAccountBridgeReceive();

const createTransaction = (account: Account): Transaction => {
  log("debug", "start createTransaction process");

  return {
    family: "filecoin",
    amount: new BigNumber(0),
    method: 0,
    version: 0,
    nonce: 0,
    gasLimit: new BigNumber(0),
    gasFeeCap: new BigNumber(0),
    gasPremium: new BigNumber(0),
    recipient: "",
    useAllAmount: false,
  };
};

const updateTransaction = (
  t: Transaction,
  patch: Transaction
): Transaction => ({ ...t, ...patch });

const getTransactionStatus = async (
  a: Account,
  t: Transaction
): Promise<TransactionStatus> => {
  log("debug", "start getTransactionStatus process");

  const errors: TransactionStatus["errors"] = {};
  const warnings: TransactionStatus["warnings"] = {};
  let estimatedFees = new BigNumber(0);
  let totalSpent = new BigNumber(0);

  const { address } = getAddress(a);
  const { recipient, amount, gasPremium, gasFeeCap, gasLimit } = t;

  if (!recipient) errors.recipient = new RecipientRequired();
  else if (address === recipient)
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  else if (!validateAddress(recipient).isValid)
    errors.recipient = new InvalidAddress();
  else if (!validateAddress(address).isValid)
    errors.sender = new InvalidAddress();

  if (
    gasFeeCap.toNumber() === 0 ||
    gasPremium.toNumber() === 0 ||
    gasLimit.toNumber() === 0
  )
    errors.gas = new FeeNotLoaded();

  // FIXME Filecoin - Fix this operation
  estimatedFees = gasFeeCap.multipliedBy(gasLimit);

  // FIXME Filecoin - Fix this operation
  totalSpent = amount.plus(estimatedFees);

  if (amount.lte(0)) errors.amount = new AmountRequired();
  //if (totalSpent.gt(a.spendableBalance)) errors.amount = new NotEnoughBalance();

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
  log("debug", "start estimateMaxSpendable process");

  const a = getMainAccount(account, parentAccount);
  const { address } = getAddress(a);
  const balances = await fetchBalances(address);

  // FIXME Filecoin - Check if we have to minus some other value
  return new BigNumber(balances.spendable_balance);
};

const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => {
  log("debug", "start prepareTransaction process");

  const { address } = getAddress(a);
  const { recipient } = t;

  if (recipient && address) {
    const result = await fetchEstimatedFees({ to: recipient, from: address });
    t.gasFeeCap = new BigNumber(result.gas_fee_cap);
    t.gasPremium = new BigNumber(result.gas_premium);
    t.gasLimit = new BigNumber(result.gas_limit);
    t.nonce = result.nonce;
  }

  return t;
};

const sync = makeSync(getAccountShape);

const broadcast: BroadcastFnSignature = async ({
  account,
  signedOperation: { operation },
}) => {
  log("debug", "start broadcast process");

  const resp = await broadcastTx(operation.extra.reqToBroadcast);

  const { hash } = resp;
  return patchOperationWithHash(operation, hash);
};

const signOperation: SignOperationFnSignature<Transaction> = ({
  account,
  deviceId,
  transaction,
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)(
    (transport) =>
      new Observable((o) => {
        async function main() {
          log("debug", "start signOperation process");

          const { recipient, amount } = transaction;
          const { id: accountId } = account;
          const { address, derivationPath } = getAddress(account);

          const filecoin = new Fil(transport);

          try {
            // FIXME Filecoin - Check if everything is ready to execute signing process over tx

            o.next({
              type: "device-signature-requested",
            });

            // Serialize tx
            const serializedTx = toCBOR(
              getAddressRaw(address),
              getAddressRaw(recipient),
              transaction
            );

            log(
              "debug",
              `Serialized CBOR tx: [${serializedTx.toString("hex")}]`
            );

            // Sign by device
            const result = await filecoin.sign(
              getPath(derivationPath),
              serializedTx
            );
            isError(result);

            o.next({
              type: "device-signature-granted",
            });

            // FIXME Filecoin - Check how to calculate the fee
            const fee = new BigNumber(0);
            const value = amount.plus(fee);

            // resolved at broadcast time
            const txHash = "";

            // build signature on the correct format
            const signature = `${result.signature_compact.toString("base64")}`;

            const reqToBroadcast = getTxToBroadcast(
              account,
              transaction,
              signature
            );

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
              extra: {
                reqToBroadcast,
              },
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
      })
  );

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
