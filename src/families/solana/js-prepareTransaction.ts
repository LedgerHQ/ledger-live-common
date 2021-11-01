import type { Account } from "../../types";
import { getNetworkInfo } from "./api";

import type { Transaction } from "./types";

const prepareTransaction = async (
  a: Account,
  tx: Transaction
): Promise<Transaction> => {
  const patch: Partial<Transaction> = {};

  const { mode } = tx;

  if (mode.kind === "token") {
    if (mode.spec.kind === "unprepared") {
      const subAccountId = mode.spec.subAccountId;
      const tokenAcc = a.subAccounts?.find((acc) => acc.id === subAccountId);
      if (tokenAcc && tokenAcc.type === "TokenAccount") {
        patch.mode = {
          ...mode,
          kind: "token",
          spec: {
            kind: "prepared",
            mintAddress: tokenAcc.token.id,
            // TODO: figure out units for token accs
            decimals: tokenAcc.token.units[0].magnitude,
          },
        };
      } else {
        throw Error("toke sub account not found");
      }
    }
  }

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
