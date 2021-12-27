import type { Account, TokenAccount } from "../../types";
import { encodeAccountId } from "../../account";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { makeSync, makeScanAccounts, mergeOps } from "../../bridge/jsHelpers";
import { getAccount, getOperations, hasESDTTokens } from "./api";
import elrondBuildESDTTokenAccounts from "./js-buildSubAccounts";
import { reconciliateSubAccounts } from "./js-reconciliation";

const getAccountShape: GetAccountShape = async (info) => {
  const { address, initialAccount, currency, derivationMode } = info;
  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });
  const oldOperations = initialAccount?.operations || [];
  // Needed for incremental synchronisation
  const startAt = 0;

  // get the current account balance state depending your api implementation
  const { blockHeight, balance, nonce } = await getAccount(address);
  // Merge new operations with the previously synced ones
  const newOperations = await getOperations(accountId, address, startAt);
  const operations = mergeOps(oldOperations, newOperations);

  let subAccounts: TokenAccount[] | undefined = [];
  if (await hasESDTTokens(address)) {
    const tokenAccounts = await elrondBuildESDTTokenAccounts({
      currency,
      accountId: accountId,
      accountAddress: address,
      existingAccount: initialAccount,
      syncConfig: {
        paginationConfig: {},
      },
    });

    if (tokenAccounts) {
      subAccounts = reconciliateSubAccounts(tokenAccounts, initialAccount);
    }
  }

  const shape = {
    id: accountId,
    balance,
    spendableBalance: balance,
    operationsCount: operations.length,
    blockHeight,
    elrondResources: {
      nonce,
    },
    subAccounts,
  };

  return { ...shape, operations };
};

const postSync = (initial: Account, parent: Account) => parent;

export const scanAccounts = makeScanAccounts(getAccountShape);
export const sync = makeSync(getAccountShape, postSync);
