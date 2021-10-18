import { makeScanAccounts, makeSync, mergeOps } from "../../bridge/jsHelpers";
import { Account, encodeAccountId } from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { getAccount, getOperations } from "./api";

const getAccountShape: GetAccountShape = async (info) => {
  const { address, initialAccount, currency, derivationMode } = info;
  const oldOperations = initialAccount?.operations || [];
  const untilTxHash = oldOperations.length ? oldOperations[0].hash : undefined;
  const { blockHeight, balance, spendableBalance } = await getAccount(address);
  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  const newOperations = await getOperations(accountId, address, untilTxHash);
  const operations = mergeOps(oldOperations, newOperations);
  const shape = {
    id: accountId,
    blockHeight,
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
