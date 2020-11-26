// @flow
import { FeeNotLoaded } from "@ledgerhq/errors";
import type { Transaction, CoreCosmosLikeTransaction } from "./types";
import type { Account, CryptoCurrency } from "../../types";
import type { Core, CoreAccount, CoreCurrency } from "../../libcore/types";

import {
  bigNumberToLibcoreAmount,
  libcoreBigIntToBigNumber,
} from "../../libcore/buildBigNumber";
import { BigNumber } from "bignumber.js";
import { cosmosCreateMessage } from "./message";
import { getEnv } from "../../env";
import { promiseAllBatched } from "../../promise";
import { getMaxEstimatedBalance } from "./logic";
import network from "../../network";

const getBaseApiUrl = (currency: CryptoCurrency) => {
  if (currency.id === "cosmos_testnet") {
    return getEnv("API_COSMOS_TESTNET_BLOCKCHAIN_EXPLORER_API_ENDPOINT");
  } else {
    return getEnv("API_COSMOS_BLOCKCHAIN_EXPLORER_API_ENDPOINT");
  }
};

const isStargate = (currency: CryptoCurrency) => {
  if (currency.id === "cosmos_testnet") {
    return getEnv("API_COSMOS_TESTNET_NODE") == "STARGATE_NODE";
  } else {
    return getEnv("API_COSMOS_NODE") == "STARGATE_NODE";
  }
};

async function fetch_sequence(address: string, currency: CryptoCurrency) {
  const namespace = "cosmos";
  const version = "v1beta1";
  if (isStargate(currency)) {
    const url = `${getBaseApiUrl(
      currency
    )}/${namespace}/auth/${version}/accounts/${address}`;
    const { data } = await network({
      method: "GET",
      url,
    });
    return data.account.sequence;
  } else {
    const url = `${getBaseApiUrl(currency)}/auth/accounts/${address}`;
    const { data } = await network({
      method: "GET",
      url,
    });

    return data.result.value.sequence;
  }
}

export async function cosmosBuildTransaction({
  account,
  core,
  coreAccount,
  coreCurrency,
  transaction,
  isCancelled,
  isPartial, // is true if we just want to estimate fees and gas
}: {
  account: Account,
  core: Core,
  coreAccount: CoreAccount,
  coreCurrency: CoreCurrency,
  transaction: Transaction,
  isPartial: boolean,
  isCancelled: () => boolean,
}): Promise<?CoreCosmosLikeTransaction> {
  const { gas, memo } = transaction;

  const cosmosLikeAccount = await coreAccount.asCosmosLikeAccount();
  if (isCancelled()) return;

  const transactionBuilder = await cosmosLikeAccount.buildTransaction();
  if (isCancelled()) return;

  let messages = await cosmosCreateMessage(
    account.freshAddress,
    {
      ...transaction,
      amount: transaction.useAllAmount
        ? getMaxEstimatedBalance(account, BigNumber(0))
        : transaction.amount,
    },
    core,
    account.currency
  );

  const memoTransaction = memo || "";
  await transactionBuilder.setMemo(memoTransaction);

  // Gas
  let estimatedGas: BigNumber;

  if (isPartial) {
    const gasRequest = await core.CosmosGasLimitRequest.init(
      memoTransaction,
      messages,
      String(getEnv("COSMOS_GAS_AMPLIFIER"))
    );
    estimatedGas = await libcoreBigIntToBigNumber(
      // NOTE: With new cosmos code, this call might fail if the account hasn't been synchronized
      // and missed a new transaction. This is because now the account sequence needs to be exact,
      // and can't be a dummy 0 like pre-Stargate.
      //
      // LibCore internally calls for sequence number synchronization here, but this is a data race between the
      // last time we read the sequence number and the instant we send the gas estimation request
      await cosmosLikeAccount.estimateGas(gasRequest)
    );
  } else {
    estimatedGas = gas || BigNumber(0);
  }

  if (!estimatedGas.gt(0)) {
    throw new FeeNotLoaded();
  }

  const gasAmount = await bigNumberToLibcoreAmount(
    core,
    coreCurrency,
    estimatedGas
  );
  if (isCancelled()) return;

  await transactionBuilder.setGas(gasAmount);

  const gasPrice = getEnv("COSMOS_GAS_PRICE");

  const feesBigNumber = estimatedGas
    .multipliedBy(gasPrice)
    .integerValue(BigNumber.ROUND_CEIL);

  const feesAmount = await bigNumberToLibcoreAmount(
    core,
    coreCurrency,
    feesBigNumber
  );
  if (isCancelled()) return;
  await transactionBuilder.setFee(feesAmount);

  if (transaction.useAllAmount && transaction.amount) {
    messages = await cosmosCreateMessage(
      account.freshAddress,
      {
        ...transaction,
        amount: getMaxEstimatedBalance(account, feesBigNumber),
      },
      core,
      account.currency
    );
  }

  promiseAllBatched(
    3,
    messages,
    async (message) => await transactionBuilder.addMessage(message)
  );

  // Signature information
  const accNum = await cosmosLikeAccount.getAccountNumber();
  await transactionBuilder.setAccountNumber(accNum);

  const seq = await fetch_sequence(account.freshAddress, account.currency);
  await transactionBuilder.setSequence(seq);

  const tx = await transactionBuilder.build();
  return tx;
}

export default cosmosBuildTransaction;
