// @flow

import { BigNumber } from "bignumber.js";
import type { Operation } from "../../types";
import { getEnv } from "../../env";

async function ripple({
  account: { id: accountId },
  signedTransaction,
  builded,
  coreAccount,
  transaction
}: *) {
  const rippleLikeAccount = await coreAccount.asRippleLikeAccount();

  const txHash = getEnv("DISABLE_TRANSACTION_BROADCAST")
    ? ""
    : await rippleLikeAccount.broadcastRawTransaction(signedTransaction);
  const senders = [freshAddress];
  const receiver = await builded.getReceiver();
  const recipients = [await receiver.toBase58()];
  const fee = await transaction.getFees();
  const tag = await transaction.getDestinationTag();
  const transactionSequenceNumberRaw = await transaction.getSequence();
  const transactionSequenceNumber = await libcoreBigIntToBigNumber(
    transactionSequenceNumberRaw
  ).toNumber();

  const op: $Exact<Operation> = {
    id: `${accountId}-${txHash}-OUT`,
    hash: txHash,
    type: "OUT",
    value: transaction.useAllAmount
      ? balance
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
