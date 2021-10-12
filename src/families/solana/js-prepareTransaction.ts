import type { Account } from "../../types";
import { getNetworkInfo } from "./api";

import type { Transaction } from "./types";

const prepareTransaction = async (
    a: Account,
    tx: Transaction
): Promise<Transaction> => {
    return tx.networkInfo
        ? tx
        : {
              ...tx,
              networkInfo: await getNetworkInfo(),
          };
};

export default prepareTransaction;
