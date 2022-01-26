import type { Transaction } from "./types";
import type { Account } from "../../types";
import { CeloTx } from "@celo/connect";
import { celoKit } from "./api/sdk";
import BigNumber from "bignumber.js";

const buildTransaction = async (account: Account, transaction: Transaction) => {
  const kit = celoKit();
  const { amount } = transaction;
  const value = (
    transaction.useAllAmount
      ? account.spendableBalance.minus(transaction.fees || 0)
      : amount
  ).toString();

  const celoToken = await kit.contracts.getGoldToken();

  const txParams = {
    from: account.freshAddress,
    to: celoToken.address,
    data: celoToken.transfer(transaction.recipient, new BigNumber(value).toFixed()).txo.encodeABI(),
  };

  return {
    ...txParams,
    chainId: await kit.connection.chainId(),
    nonce: await kit.connection.nonce(account.freshAddress),
    gas: await kit.connection.estimateGasWithInflationFactor(txParams),
    gasPrice: await kit.connection.gasPrice(),
  } as CeloTx;
};

export default buildTransaction;
