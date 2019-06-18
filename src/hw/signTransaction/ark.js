// @flow
import * as ArkCrypto from "@arkecosystem/crypto";
import Ark from "@arkecosystem/ledger-transport";
import type Transport from "@ledgerhq/hw-transport";
import type { CryptoCurrency } from "../../types";

export default async (
  currency: CryptoCurrency,
  transport: Transport<*>,
  path: string,
  txArg: Object
) => {
  const tx = { ...txArg };
  const ark = new Ark(transport);

  const rawTxHex = ArkCrypto.TransactionSerializer.getBytes(tx, {
      excludeSignature: true,
      excludeSecondSignature: true
    }).toString('hex');

  const sign = await ark.signTransaction(path, rawTxHex);

  tx.signature = sign.signature;
  tx.id = ArkCrypto.crypto.getId(tx);

  return JSON.stringify(tx);
};
