// @flow

import Btc from "@ledgerhq/hw-app-btc";
import Transport from "@ledgerhq/hw-transport";
import { isSegwitDerivationMode } from "../../derivation";
import type { CryptoCurrency, DerivationMode, Account } from "../../types";
import type {
  CoreCurrency,
  CoreBitcoinLikeTransaction,
  CoreBitcoinLikeInput,
  CoreBitcoinLikeOutput
} from "../../libcore/types";
import { log } from "../../logs";

export async function bitcoinSignTransaction({
  account,
  isCancelled,
  transport,
  currency,
  coreCurrency,
  coreTransaction,
  derivationMode
}: {
  isCancelled: () => boolean,
  account: Account,
  transport: Transport<*>,
  currency: CryptoCurrency,
  coreCurrency: CoreCurrency,
  coreTransaction: CoreBitcoinLikeTransaction,
  derivationMode: DerivationMode
}) {
  const networkParams = await coreCurrency.getBitcoinLikeNetworkParameters();
  if (isCancelled()) return;

  const sigHashType = parseInt(await networkParams.getSigHash(), 16);

  if (isCancelled()) return;

  const hasTimestamp = await networkParams.getUsesTimestampedTransaction();
  if (isCancelled()) return;

  const hwApp = new Btc(transport);
  const additionals = [];
  let expiryHeight;
  if (currency.id === "bitcoin_cash" || currency.id === "bitcoin_gold")
    additionals.push("bip143");
  if (currency.id === "zcash" || currency.id === "komodo") {
    expiryHeight = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    if (account.blockHeight >= 419200) {
      additionals.push("sapling");
    }
  } else if (currency.id === "decred") {
    expiryHeight = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    additionals.push("decred");
  }

  const rawInputs: CoreBitcoinLikeInput[] = await coreTransaction.getInputs();
  if (isCancelled()) return;

  const hasExtraData = currency.id === "zcash" || currency.id === "komodo";

  // TODO handle isCancelled

  const inputs = await Promise.all(
    rawInputs.map(async input => {
      const hexPreviousTransaction = await input.getPreviousTransaction();
      log("libcore", "splitTransaction " + String(hexPreviousTransaction));
      const previousTransaction = hwApp.splitTransaction(
        hexPreviousTransaction,
        currency.supportsSegwit,
        hasTimestamp,
        hasExtraData,
        additionals
      );

      const outputIndex = await input.getPreviousOutputIndex();

      const sequence = await input.getSequence();

      return [
        previousTransaction,
        outputIndex,
        undefined, // we don't use that TODO: document
        sequence // 0xffffffff,
      ];
    })
  );
  if (isCancelled()) return;

  const associatedKeysets = await Promise.all(
    rawInputs.map(async input => {
      const derivationPaths = await input.getDerivationPath();
      const [first] = derivationPaths;
      if (!first) throw new Error("unexpected empty derivationPaths");
      const r = await first.toString();
      return r;
    })
  );
  if (isCancelled()) return;

  const outputs: CoreBitcoinLikeOutput[] = await coreTransaction.getOutputs();
  if (isCancelled()) return;

  let changePath;

  for (const o of outputs) {
    const derivationPath = await o.getDerivationPath();
    if (isCancelled()) return;

    if (derivationPath) {
      const isDerivationPathNull = await derivationPath.isNull();
      if (!isDerivationPathNull) {
        const strDerivationPath = await derivationPath.toString();
        if (isCancelled()) return;

        const derivationArr = strDerivationPath.split("/");
        if (derivationArr[derivationArr.length - 2] === "1") {
          changePath = strDerivationPath;
          break;
        }
      }
    }
  }

  const outputScriptHex = await coreTransaction.serializeOutputs();
  if (isCancelled()) return;

  const initialTimestamp = hasTimestamp
    ? await coreTransaction.getTimestamp()
    : undefined;
  if (isCancelled()) return;

  // FIXME
  // should be `transaction.getLockTime()` as soon as lock time is
  // handled by libcore (actually: it always returns a default value
  // and that caused issue with zcash (see #904))
  let lockTime;

  // Set lockTime for Komodo to enable reward claiming on UTXOs created by
  // Ledger Live. We should only set this if the currency is Komodo and
  // lockTime isn't already defined.
  if (currency.id === "komodo" && lockTime === undefined) {
    const unixtime = Math.floor(Date.now() / 1000);
    lockTime = unixtime - 777;
  }

  const signedTransaction = await hwApp.createPaymentTransactionNew(
    // $FlowFixMe not sure what's wrong
    inputs,
    associatedKeysets,
    changePath,
    outputScriptHex,
    lockTime,
    sigHashType,
    isSegwitDerivationMode(derivationMode),
    initialTimestamp || undefined,
    additionals,
    expiryHeight
  );

  return signedTransaction; // eslint-disable-line
}

export default bitcoinSignTransaction;
