import type { Transaction } from "./types";
import type { Account } from "../../types";
import { Units, utils } from "@crypto-com/chain-jslib";
import { getAccountParams } from "./api/sdk";
import { getCroSdk } from "./logic";

const getTransactionAmount = (a: Account, t: Transaction) => {
  const croSdk = getCroSdk(a.currency.id);

  switch (t.mode) {
    case "send":
      if (t.useAllAmount) {
        const amountMinusFee = t.amount.minus(t.fees || 0);
        return new croSdk.Coin(amountMinusFee.toString(), Units.BASE);
      } else {
        return new croSdk.Coin(t.amount.toString(), Units.BASE);
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
  const croSdk = getCroSdk(a.currency.id);
  const address = a.freshAddresses[0].address;
  const { accountNumber, sequence } = await getAccountParams(
    address,
    a.currency.id
  );
  const rawTx = new croSdk.RawTransaction();
  rawTx.setFee(new croSdk.Coin((t.fees || 0).toString(), Units.BASE));

  const msgSend = new croSdk.bank.MsgSend({
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
