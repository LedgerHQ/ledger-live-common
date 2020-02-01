// @flow

import type { Account } from "../types/account";
import type { CryptoCurrency } from "../types/currencies";

export type SyncAction =
  | { type: "BACKGROUND_TICK" }
  | { type: "SET_SKIP_UNDER_PRIORITY", priority: number }
  | { type: "SYNC_ONE_ACCOUNT", accountId: string, priority: number }
  | { type: "SYNC_SOME_ACCOUNTS", accountIds: string[], priority: number }
  | { type: "SYNC_ALL_ACCOUNTS", priority: number };

export type SyncState = {
  pending: boolean,
  error: ?Error
};

export type BridgeSyncState = {
  syncs: { [accountId: string]: SyncState }
};

// trigger an action
export type Sync = (action: SyncAction) => void;

export type BridgeSyncContext = React$Context<Sync>;

export type BridgeSyncStateContext = React$Context<BridgeSyncState>;

export function useBridgeSync(): Sync {
  throw new Error("no impl");
}

export type BridgeSync = React$ComponentType<{
  // this is a wrapping component that you need to put in your tree
  children: React$Node,
  // you need to inject the accounts to sync on
  accounts: Account[],
  // provide a way to save the result of an account sync update
  updateAccountWithUpdater: (
    accountId: string,
    updater: (Account) => Account
  ) => void,
  // handles an error / log / do action with it
  // if the function returns falsy, the sync will ignore error, otherwise it's treated as error with the error you return (likely the same)
  recoverError: Error => ?Error,
  // track sync lifecycle for analytics
  trackAnalytics: (string, ?Object) => void,
  // load all data needed for a currency (it's calling currencyBridge prepare mechanism)
  prepareCurrency: (currency: CryptoCurrency) => Promise<void>,
  // provide an implementation of hydrate (it preload from a local storage impl the data cached from a previous prepare)
  hydrateCurrency: (currency: CryptoCurrency) => Promise<void>
}>;

// NOTES FOR IMPLEMENTATION VS CURRENT IMPL OF LLD/LLM:
// it needs to exposes BridgeSyncContext
// bridgeSync, setAccountSyncState => internal state in the component! exposed over BridgeSyncStateContext
// isUpToDate => should not be needed because it's part of accounts info & local state
// currenciesStatus => either it's part of live-common or we drop it. i think we drop it, we already have that info in the crypto data.
// logger => use log()
// logger.critical to be done as part of onError but not for random errors
// recentlyChangedExperimental & stuff => shouldIgnoreError()

export function useGlobalSyncState(): SyncState {
  throw new Error("no impl");
}

export function useAccountSyncState(_: { accountId: string }): SyncState {
  throw new Error("no impl");
}

export type SyncBackground = React$ComponentType<{}>;

export type SyncAllAccountsOnMount = React$ComponentType<{
  priority: number
}>;

export type SyncOneAccountOnMount = React$ComponentType<{
  accountId: string,
  priority: number
}>;

export type SyncSkipUnderPriority = React$ComponentType<{
  priority: number
}>;

// FIXME put this back in the global sync logic ?!
export type SyncContinouslyPendingOperations = React$ComponentType<{
  priority: number
}>;

// LLD usage of
`
setSyncBehavior({
  type: "SYNC_ONE_ACCOUNT",
  accountId,
  priority: 10,
});
`;
// can be reworked with rendering SyncOneAccountOnMount and if `userAction`

// SIMILAR for the global action! to be reworked with a new SyncAllAccountsOnMount
