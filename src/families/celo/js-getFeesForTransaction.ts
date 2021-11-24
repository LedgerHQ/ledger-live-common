import { CeloTx } from "@celo/connect";
import { BigNumber } from "bignumber.js";
import { Account, Transaction } from "../../types";
import { celoKit } from "./api/sdk";

const getFeesForTransaction = async ({
  account,
  transaction,
}: {
  account: Account;
  transaction: Transaction;
}): Promise<BigNumber> => {
  const { amount } = transaction;
  const kit = celoKit();

  // A workaround - estimating gas throws an error if value > funds
  const value = BigNumber.minimum(amount, account.spendableBalance).toString();

  const celoTransaction: CeloTx = {
    from: account.freshAddress,
    value,
    to: transaction.recipient,
  };

  const gasPrice = new BigNumber(await kit.connection.gasPrice());
  const gas = await kit.connection.estimateGasWithInflationFactor(
    celoTransaction
  );

  return gasPrice.times(gas);
};

export default getFeesForTransaction;
