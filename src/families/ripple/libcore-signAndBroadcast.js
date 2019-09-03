// @flow

import { BigNumber } from "bignumber.js";
import type { Account, Operation } from "../../types";
import { getEnv } from "../../env";
import { libcoreBigIntToBigNumber } from "../../libcore/buildBigNumber";
import type { CoreRippleLikeTransaction, Transaction } from "../ethereum/types";
import type { CoreAccount } from "../../libcore/types";

async function ripple({
  account: { id: accountId, freshAddress },
  signedTransaction,
  builded,
  coreAccount,
  transaction
}: {
  account: Account,
  signedTransaction: string,
  builded: CoreRippleLikeTransaction,
  coreAccount: CoreAccount,
  transaction: Transaction
}) {
  const rippleLikeAccount = await coreAccount.asRippleLikeAccount();

  // FIXME, it doesn't pass this point, broadcastRawTransaction fails.
  // Disabling the broadcast succeeds, hash is empty. Signing broken?
  const txHash = getEnv("DISABLE_TRANSACTION_BROADCAST")
    ? ""
    : await rippleLikeAccount.broadcastRawTransaction(signedTransaction);
  const senders = [freshAddress];
  const receiver = await builded.getReceiver();
  const recipients = [await receiver.toBase58()];
  const fee = await builded.getFees();
  const tag = await builded.getDestinationTag();
  const transactionSequenceNumberRaw = await builded.getSequence();
  const transactionSequenceNumber = (await libcoreBigIntToBigNumber(
    transactionSequenceNumberRaw
  )).toNumber();

  const op: $Exact<Operation> = {
    id: `${accountId}-${txHash}-OUT`,
    hash: txHash,
    type: "OUT",
    value: transaction.useAllAmount
      ? account.balance
      : BigNumber(transaction.amount || 0).plus(fee),
    fee,
    blockHash: null,
    blockHeight: null,
    senders,
    recipients,
    accountId,
    date: new Date(),
    transactionSequenceNumber,
    extra: {
      tag
    }
  };

  return op;
}

export default ripple;
