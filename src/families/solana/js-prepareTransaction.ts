import type { Account } from "../../types";
import { getNetworkInfo } from "./api";

import type { Transaction } from "./types";

const prepareTransaction = async (
  a: Account,
  tx: Transaction
): Promise<Transaction> => {
  if (tx.fees) {
    return tx;
  }

  const networkInfo = await getNetworkInfo();

  return {
    ...tx,
    fees: networkInfo.lamportsPerSignature,
    networkInfo,
  };
};

export default prepareTransaction;
