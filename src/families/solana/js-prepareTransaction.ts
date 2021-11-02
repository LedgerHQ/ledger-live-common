import type { Account } from "../../types";
import { getNetworkInfo } from "./api";

import type { Transaction } from "./types";

const prepareTransaction = async (
  a: Account,
  tx: Transaction
): Promise<Transaction> => {
  const patch: Partial<Transaction> = {};

  /*
  if (tx.subAccountId) {
    const { mode } = tx;
    const tokenAcc = a.subAccounts?.find((acc) => acc.id === tx.subAccountId);
    if (tokenAcc && tokenAcc.type === "TokenAccount") {
      patch.mode = {
        fundRecipient: mode.kind === "token" && mode.fundRecipient,
        kind: "token",
        spec: {
          kind: "prepared",
          //tokenAcc,
          mintAddress: tokenAcc.token.id,
          // TODO: figure out units for token accs
          decimals: tokenAcc.token.units[0].magnitude,
        },
      };
    } else {
      throw Error("toke sub account not found");
    }
  }
  */

  if (tx.fees === undefined) {
    const networkInfo = await getNetworkInfo();
    patch.networkInfo = networkInfo;
    patch.fees = networkInfo.lamportsPerSignature;
  }

  return Object.keys(patch).length > 0
    ? {
        ...tx,
        ...patch,
      }
    : tx;
};

export default prepareTransaction;
