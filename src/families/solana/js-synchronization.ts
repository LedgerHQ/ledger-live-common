import { makeScanAccounts, makeSync, mergeOps } from "../../bridge/jsHelpers";
import type { Account } from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { getAccount, getOperations } from "./api";

const getAccountShape: GetAccountShape = async (info) => {
  const { id, address, initialAccount } = info;
  const oldOperations = initialAccount?.operations || [];
  const startAt = oldOperations.length
    ? (oldOperations[0].blockHeight || 0) + 1
    : 0;
  const { balance, spendableBalance } = await getAccount(address);
  const newOperations = await getOperations(id, address, startAt);
  const operations = mergeOps(oldOperations, newOperations);
  const shape = {
    id,
    balance,
    spendableBalance,
    operationsCount: operations.length,
  };
  return { ...shape, operations };
};

const postSync = (initial: Account, parent: Account) => {
  return parent;
};

export const sync = makeSync(getAccountShape, postSync);
export const scanAccounts = makeScanAccounts(getAccountShape);
