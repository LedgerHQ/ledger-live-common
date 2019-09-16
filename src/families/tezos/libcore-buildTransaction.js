// @flow

import { BigNumber } from "bignumber.js";
import { FeeNotLoaded } from "@ledgerhq/errors";
import type { Account } from "../../types";
import { isValidRecipient } from "../../libcore/isValidRecipient";
import {
  bigNumberToLibcoreAmount,
  bigNumberToLibcoreBigInt
} from "../../libcore/buildBigNumber";
import type { Core, CoreCurrency, CoreAccount } from "../../libcore/types";
import type { CoreTezosLikeTransaction, Transaction } from "./types";

// TODO NotEnoughGas, NotEnoughBalance ?
export async function tezosBuildTransaction({
  account,
  core,
  coreAccount,
  coreCurrency,
  transaction,
  isCancelled
}: {
  account: Account,
  core: Core,
  coreAccount: CoreAccount,
  coreCurrency: CoreCurrency,
  transaction: Transaction,
  isPartial: boolean,
  isCancelled: () => boolean
}): Promise<?CoreTezosLikeTransaction> {
  const { currency } = account;
  const { recipient, fees, gasLimit, storageLimit } = transaction;

  const tezosLikeAccount = await coreAccount.asTezosLikeAccount();

  await isValidRecipient({ currency, recipient });

  if (!fees || !gasLimit || !storageLimit || !BigNumber(gasLimit).gt(0)) {
    throw new FeeNotLoaded();
  }

  const feesAmount = await bigNumberToLibcoreAmount(core, coreCurrency, fees);

  const gasLimitAmount = await bigNumberToLibcoreAmount(
    core,
    coreCurrency,
    gasLimit
  );

  const storageBigInt = await bigNumberToLibcoreBigInt(core, storageLimit);

  if (isCancelled()) return;
  const transactionBuilder = await tezosLikeAccount.buildTransaction();
  if (isCancelled()) return;

  await transactionBuilder.setType(transaction.type);
  if (isCancelled()) return;

  if (transaction.useAllAmount) {
    await transactionBuilder.wipeToAddress(recipient);
    if (isCancelled()) return;
  } else {
    if (!transaction.amount) throw new Error("amount is missing");
    const amount = await bigNumberToLibcoreAmount(
      core,
      coreCurrency,
      BigNumber(transaction.amount)
    );
    if (isCancelled()) return;
    await transactionBuilder.sendToAddress(amount, recipient);
    if (isCancelled()) return;
  }

  await transactionBuilder.setGasLimit(gasLimitAmount);
  if (isCancelled()) return;

  await transactionBuilder.setFees(feesAmount);
  if (isCancelled()) return;

  await transactionBuilder.setStorageLimit(storageBigInt);
  if (isCancelled()) return;

  const builded = await transactionBuilder.build();
  if (isCancelled()) return;

  return builded;
}

export default tezosBuildTransaction;
