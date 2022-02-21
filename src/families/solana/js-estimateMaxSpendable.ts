import type { AccountBridge } from "../../types";
import type { Transaction } from "./types";
import BigNumber from "bignumber.js";
import { ChainAPI } from "./api";

const estimateMaxSpendableWithAPI = async (
  {
    account,
  }: Parameters<AccountBridge<Transaction>["estimateMaxSpendable"]>[0],
  api: ChainAPI
): Promise<BigNumber> => {
  const txFee = (await api.getTxFeeCalculator()).lamportsPerSignature;

  switch (account.type) {
    case "Account":
      return BigNumber.max(account.balance.minus(txFee), 0);
    case "TokenAccount":
      return account.balance;
  }

  throw new Error("not supported account type");
};

export default estimateMaxSpendableWithAPI;
