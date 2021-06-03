//@flow
import type { Account } from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { makeSync, makeScanAccounts, mergeOps } from "../../bridge/jsHelpers";

import { getAccount, getOperations } from "./api";
import { TESTNET_CURRENCY_ID } from "./logic";

const getAccountShape: GetAccountShape = async (info) => {
  const { id, address, initialAccount, currency } = info;
  const oldOperations = initialAccount?.operations || [];

  const useTestNet = currency.id == TESTNET_CURRENCY_ID ? true : false;
  // get the current account balance state depending your api implementation
  const {
    blockHeight,
    balance,
    bondedBalance,
    redelegatingBalance,
    unbondingBalance,
    commissions,
  } = await getAccount(address, useTestNet);

  // Merge new operations with the previously synced ones
  let startAt = 0;
  let maxIteration = 20;
  let operations = oldOperations;
  let newOperations = await getOperations(id, address, startAt++, useTestNet);
  do {
    operations = mergeOps(operations, newOperations);
    newOperations = await getOperations(id, address, startAt++, useTestNet);
  } while (--maxIteration && newOperations.length != 0);

  const shape = {
    id,
    balance,
    spendableBalance: balance,
    operationsCount: operations.length,
    blockHeight,
    cryptoOrgResources: {
      bondedBalance,
      redelegatingBalance,
      unbondingBalance,
      commissions,
    },
  };

  return { ...shape, operations };
};

const postSync = (initial: Account, parent: Account) => parent;

export const scanAccounts = makeScanAccounts(getAccountShape);

export const sync = makeSync(getAccountShape, postSync);
