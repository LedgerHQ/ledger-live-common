// @flow

import invariant from "invariant";

import type { Account } from "../../types";
import type { Transaction } from "./types";

import { requiresSatStackReady } from "./satstack";
import { getAccountNetworkInfo } from "./getAccountNetworkInfo";
import { inferFeePerByte } from "./logic";

const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => {
  console.log("XXX - prepareTransaction - START");

  if (a.currency.id === "bitcoin") {
    await requiresSatStackReady();
  }
  let networkInfo = t.networkInfo;
  if (!networkInfo) {
    networkInfo = await getAccountNetworkInfo(a);
    invariant(networkInfo.family === "bitcoin", "bitcoin networkInfo expected");
  }

  const feePerByte = inferFeePerByte(t, networkInfo);
  console.log("XXX - prepareTransaction - END");
  if (
    t.networkInfo === networkInfo &&
    (feePerByte === t.feePerByte || feePerByte.eq(t.feePerByte || 0))
    // nothing changed
  ) {
    return t;
  }
  return {
    ...t,
    networkInfo,
    feePerByte,
  };
};

export default prepareTransaction;
