// @flow
import type {
  Transaction,
  CoreCosmosLikeTransaction,
  CoreCosmosGasLimitRequest
} from "./types";
import type { Account } from "../../types";
import type { Core, CoreAccount, CoreCurrency } from "../../libcore/types";

import {
  bigNumberToLibcoreAmount,
  libcoreBigIntToBigNumber
} from "../../libcore/buildBigNumber";
import { BigNumber } from "bignumber.js";
import { cosmosCreateMessage } from "./message";
import { getEnv } from "../../env";
import { promiseAllBatched } from "../../promise";

export async function cosmosBuildTransaction({
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
}): Promise<?CoreCosmosLikeTransaction> {
  const { fees, gasLimit, memo } = transaction;

  const cosmosLikeAccount = await coreAccount.asCosmosLikeAccount();
  if (isCancelled()) return;

  const transactionBuilder = await cosmosLikeAccount.buildTransaction();
  if (isCancelled()) return;

  const messages = await cosmosCreateMessage(
    account.freshAddress,
    transaction,
    core
  );

  promiseAllBatched(
    3,
    messages,
    async message => await transactionBuilder.addMessage(message)
  );

  console.log("set memo");
  const memoTransaction = memo ? memo : "";
  await transactionBuilder.setMemo(memoTransaction);

  // Gas
  console.log("set gas");

  let gas: BigNumber;

  if (gasLimit && gasLimit !== "0") {
    gas = BigNumber(gasLimit);
  } else {
    const gasRequest: CoreCosmosGasLimitRequest = {
      memo: memoTransaction,
      amplifier: getEnv("COSMOS_GAS_AMPLIFIER"),
      messages
    };
    console.log("estimate gas : ", gasRequest);
    gas = await libcoreBigIntToBigNumber(
      await cosmosLikeAccount.estimateGas(gasRequest)
    );
    console.log("Estimate from ", gasRequest, " => ", gas.toString());
  }
  const gasAmount = await bigNumberToLibcoreAmount(core, coreCurrency, gas);
  if (isCancelled()) return;

  console.log("Gas amount  => ", gasAmount);
  await transactionBuilder.setGas(gasAmount);

  const gasPrice = getEnv("COSMOS_GAS_PRICE");

  console.log(
    "set fee :",
    gas
      .multipliedBy(gasPrice)
      .integerValue(BigNumber.ROUND_CEIL)
      .toString()
  );

  const feesAmount = await bigNumberToLibcoreAmount(
    core,
    coreCurrency,
    fees ? fees : gas.multipliedBy(gasPrice).integerValue(BigNumber.ROUND_CEIL)
  );
  if (isCancelled()) return;
  await transactionBuilder.setFee(feesAmount);

  // Signature information
  console.log("get sequence");
  const seq = await cosmosLikeAccount.getSequence();
  console.log("value of seq : ", seq);

  console.log("get account number");
  const accNum = await cosmosLikeAccount.getAccountNumber();
  await transactionBuilder.setAccountNumber(accNum);
  await transactionBuilder.setSequence(seq);

  return await transactionBuilder.build();
}

export default cosmosBuildTransaction;
