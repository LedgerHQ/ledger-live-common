// @flow
import Str from "@ledgerhq/hw-app-str";
import type Transport from "@ledgerhq/hw-transport";
import { Server } from "stellar-sdk";

import {
  Memo,
  Operation,
  Keypair,
  Asset,
  TransactionBuilder,
  xdr,
  BASE_FEE
} from "stellar-sdk";
import { Networks } from "stellar-base";
import type { CryptoCurrency } from "../../types";

export default async (
  currency: CryptoCurrency,
  transport: Transport<*>,
  path: string,
  transaction: {
    freshAddress: string,
    destination: string,
    asset: Asset,
    memo: string,
    memoType: string,
    fee: string,
    amount: string
  }
) => {
  const server = new Server("https://horizon.stellar.org");
  const account = await server.loadAccount(transaction.freshAddress);
  let creatingAccount = false;

  try {
    await server.loadAccount(transaction.destination);
  } catch (err) {
    creatingAccount = true;
  }

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC
  });

  if (creatingAccount) {
    if (parseInt(transaction.amount) < 100) {
      // FIXME times the number of entries in the account
      throw new Error("FIXME stellar account not created error");
    }
    tx.addOperation(
      Operation.createAccount({
        destination: transaction.destination,
        startingBalance: transaction.amount
      })
    );
  } else {
    tx.addOperation(
      Operation.payment({
        destination: transaction.destination,
        asset: Asset.native(),
        amount: transaction.amount
      })
    );
  }
  if (transaction.memo) {
    switch (transaction.memoType) {
      case "MEMO_TEXT":
        tx.addMemo(Memo.text(transaction.memo));
        break;
      case "MEMO_ID":
        tx.addMemo(Memo.id(transaction.memo));
        break;
      case "MEMO_HASH":
        tx.addMemo(Memo.hash(transaction.memo));
        break;
      case "MEMO_RETURN":
        tx.addMemo(Memo.return(transaction.memo));
        break;
      default:
      // Do nothing
    }
  }
  // Set an upper time bound where if this tx is not published it will no longer
  // be. This allows us to be sure the tx will not be broadcasted in the future.
  // @href https://www.stellar.org/developers/guides/concepts/transactions.html#time-bounds
  tx = tx.setTimeout(180).build();
  const str = new Str(transport);
  const sig = await str.signTransaction(path, tx.signatureBase());
  const hint = Keypair.fromPublicKey(transaction.freshAddress).signatureHint();
  const decorated = new xdr.DecoratedSignature({
    signature: sig.signature,
    hint
  });

  tx.signatures.push(decorated);

  return tx
    .toEnvelope()
    .toXDR()
    .toString("base64");
};
