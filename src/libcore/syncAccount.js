// @flow

import { Observable, from, defer } from "rxjs";
import { map } from "rxjs/operators";
import { log } from "@ledgerhq/logs";
import { SyncError } from "@ledgerhq/errors";
import type {
  SyncConfig,
  Account,
  CryptoCurrency,
  DerivationMode,
} from "../types";
import { withLibcore } from "./access";
import { buildAccount } from "./buildAccount";
import { getCoreAccount } from "./getCoreAccount";
import { remapLibcoreErrors } from "./errors";
import { shouldRetainPendingOperation } from "../account";
import postSyncPatchPerFamily from "../generated/libcore-postSyncPatch";

let coreSyncCounter = 0;
export const newSyncLogId = () => ++coreSyncCounter;

export async function syncCoreAccount({
  core,
  coreWallet,
  coreAccount,
  currency,
  accountIndex,
  derivationMode,
  seedIdentifier,
  existingAccount,
  logId,
  syncConfig,
}: {
  core: *,
  coreWallet: *,
  coreAccount: *,
  currency: CryptoCurrency,
  accountIndex: number,
  derivationMode: DerivationMode,
  seedIdentifier: string,
  existingAccount?: ?Account,
  logId: number,
  syncConfig: SyncConfig,
}): Promise<Account> {
  try {
    if (!syncConfig.withoutSynchronize) {
      log("libcore", `sync(${logId}) syncCoreAccount`);
      const eventReceiver = await core.EventReceiver.newInstance();
      const eventBus = await coreAccount.synchronize();

      log("libcore", `sync(${logId}) DONE coreAccount.synchronize`);
      const serialContext = await core
        .getThreadDispatcher()
        .getMainExecutionContext();

      await eventBus.subscribe(serialContext, eventReceiver);
      log("libcore", `sync(${logId}) DONE eventBus.subscribe`);
    }

    const account = await buildAccount({
      core,
      coreWallet,
      coreAccount,
      currency,
      accountIndex,
      derivationMode,
      seedIdentifier,
      existingAccount,
      logId,
      syncConfig,
    });

    return account;
  } catch (e) {
    const specificError = remapLibcoreErrors(e);
    if (specificError.name !== "Error") throw specificError;
    throw new SyncError(specificError.message);
  }
}

const defaultPostSyncPatch = (initial: Account, synced: Account): Account =>
  synced;

export function sync(
  existingAccount: Account,
  syncConfig: SyncConfig
): Observable<(Account) => Account> {
  const logId = newSyncLogId();
  const { derivationMode, seedIdentifier, currency } = existingAccount;
  const postSyncPatch =
    postSyncPatchPerFamily[currency.family] || defaultPostSyncPatch;
  return defer(() =>
    from(
      withLibcore((core) => {
        log("libcore", `sync(${logId}) started. ${existingAccount.id}`);
        return getCoreAccount(core, existingAccount).then(
          ({ coreWallet, coreAccount, walletName }) =>
            syncCoreAccount({
              core,
              coreWallet,
              coreAccount,
              walletName,
              currency,
              accountIndex: existingAccount.index,
              derivationMode,
              seedIdentifier,
              existingAccount,
              logId,
              syncConfig,
            })
        );
      })
    )
  ).pipe(
    map((syncedAccount) => (initialAccount) =>
      postSyncPatch(initialAccount, {
        ...initialAccount,
        // FIXME, the "patching" logic should be somewhere else, especially that it's also in jsHelpers
        id: syncedAccount.id,
        freshAddress: syncedAccount.freshAddress,
        freshAddressPath: syncedAccount.freshAddressPath,
        balance: syncedAccount.balance,
        balanceHistory: syncedAccount.balanceHistory,
        spendableBalance: syncedAccount.spendableBalance,
        blockHeight: syncedAccount.blockHeight,
        lastSyncDate: new Date(),
        creationDate: syncedAccount.creationDate,
        operations: syncedAccount.operations,
        subAccounts: syncedAccount.subAccounts,
        pendingOperations: initialAccount.pendingOperations.filter((op) =>
          shouldRetainPendingOperation(syncedAccount, op)
        ),
        cosmosResources: syncedAccount.cosmosResources,
      })
    )
  );
}
