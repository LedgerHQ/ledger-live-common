// @flow
import type { Transaction } from "./types";
import type { Account } from "../../types";
import { Units, utils } from "@crypto-com/chain-jslib";
import { getAccountParams } from "./api/sdk";
import { CroSdk } from "./logic";

const getTransactionAmount = (a: Account, t: Transaction) => {
  switch (t.mode) {
    case "send":
      if (t.useAllAmount) {
        const amountMinusFee = t.amount.minus(t.fees);
        return new CroSdk.Coin(amountMinusFee.toString(), Units.BASE);
      } else {
        return new CroSdk.Coin(t.amount.toString(), Units.BASE);
      }
    default:
      throw new Error("Unknown mode in transaction");
  }
};

/**
 *
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildTransaction = async (
  a: Account,
  t: Transaction,
  publicKey: string
) => {
  const address = a.freshAddresses[0].address;
  const { accountNumber, sequence } = await getAccountParams(address);
  const rawTx = new CroSdk.RawTransaction();
  rawTx.setFee(new CroSdk.Coin(t.fees.toString(), Units.BASE));

  const msgSend = new CroSdk.bank.MsgSend({
    fromAddress: address,
    toAddress: t.recipient,
    amount: getTransactionAmount(a, t),
  });

  const signableTx = rawTx
    .appendMessage(msgSend)
    .addSigner({
      publicKey: utils.Bytes.fromHexString(publicKey),
      accountNumber: new utils.Big(accountNumber),
      accountSequence: new utils.Big(sequence),
      signMode: 0,
    })
    .toSignable();

  return signableTx;
};
