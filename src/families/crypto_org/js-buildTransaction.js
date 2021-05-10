// @flow
import type { Transaction } from "./types";
import type { Account } from "../../types";
import { CroSDK } from "@crypto-com";
import { getNonce } from "./logic";

/**
 *
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildTransaction = async (a: Account, t: Transaction) => {
  const nonce = getNonce(a);

  const rawTx = new CroSDK.RawTransaction();
  const feeAmount = new CroSDK.Coin("6500", CroSDK.Units.BASE);
  rawTx.setGasLimit("280000");
  rawTx.setFee(feeAmount);
  rawTx.setTimeOutHeight("341910");
  const msgSend = new CroSDK.bank.MsgSend({
    fromAddress: a.address,
    toAddress: t.recipient,
    amount: new CroSDK.Coin(t.amount.toString(), CroSDK.Units.BASE),
  });

  const signableTx = rawTx
    .appendMessage(msgSend)
    .addSigner({
      publicKey: a.xpub,
      accountNumber: nonce,
      accountSequence: nonce,
    })
    .toSignable();

  return signableTx;
};
