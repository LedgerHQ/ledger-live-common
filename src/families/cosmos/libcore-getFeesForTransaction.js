// @flow

import type { Account } from "../../types";
import type { Core, CoreCurrency, CoreAccount } from "../../libcore/types";
import type { Transaction } from "./types";
import { libcoreAmountToBigNumber } from "../../libcore/buildBigNumber";
import buildTransaction from "./libcore-buildTransaction";

async function cosmos(args: {
  account: Account,
  core: Core,
  coreAccount: CoreAccount,
  coreCurrency: CoreCurrency,
  transaction: Transaction,
  isPartial: boolean,
  isCancelled: () => boolean
}) {
  console.log("get Fees for transaction");
  const builded = await buildTransaction(args);
  if (!builded) return;
  const estimatedFees = await libcoreAmountToBigNumber(await builded.getFee());
  return { estimatedFees };
}

export default cosmos;
