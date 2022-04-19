import { encodeAccountId } from "../../account";
import {
  makeSync,
  makeScanAccounts,
  GetAccountShape,
  mergeOps,
} from "../../bridge/jsHelpers";
import { getAccount, getOperations } from "./api";

const getAccountShape: GetAccountShape = async (info) => {
  const { address, initialAccount, currency, derivationMode } = info;
  const oldOperations = initialAccount?.operations || [];

  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  const { blockHeight, balance } = await getAccount(address);

  // Merge new operations with the previously synced ones
  let startAt = 0;
  let maxIteration = 20;
  let operations = oldOperations;

  let newOperations = await getOperations(accountId, address, startAt);
  do {
    operations = mergeOps(operations, newOperations);
    newOperations = await getOperations(accountId, address, startAt++);
  } while (--maxIteration && newOperations.length != 0);

  const shape = {
    id: accountId,
    balance,
    spendableBalance: balance,
    operationsCount: operations.length,
    blockHeight,
  };
  return { ...shape, operations };
};

export const scanAccounts = makeScanAccounts({ getAccountShape });
export const sync = makeSync({ getAccountShape });
