// @flow

import { BigNumber } from "bignumber.js";
import { Observable, from } from "rxjs";
import { log } from "@ledgerhq/logs";
import {
  TransportStatusError,
  UserRefusedAddress,
  WrongDeviceForAccount,
} from "@ledgerhq/errors";
import {
  getSeedIdentifierDerivation,
  getDerivationModesForCurrency,
  getDerivationScheme,
  runDerivationScheme,
  isIterableDerivationMode,
  derivationModeSupportsIndex,
  getMandatoryEmptyAccountSkip,
  getDerivationModeStartsAt,
} from "../derivation";
import {
  getAccountPlaceholderName,
  getNewAccountPlaceholderName,
  shouldRetainPendingOperation,
  isAccountEmpty,
  shouldShowNewAccount,
} from "../account";
import uniqBy from "lodash/uniqBy";
import type {
  Operation,
  Account,
  ScanAccountEvent,
  SyncConfig,
  CryptoCurrency,
} from "../types";
import type { CurrencyBridge, AccountBridge } from "../types/bridge";
import getAddress from "../hw/getAddress";
import { open, close } from "../hw";
import { withDevice } from "../hw/deviceAccess";

export type GetAccountShape = (
  {
    currency: CryptoCurrency,
    address: string,
    id: string,
    initialAccount?: Account,
  },
  SyncConfig
) => Promise<$Shape<Account>>;

type AccountUpdater = (Account) => Account;

export function mergeOps(
  existing: Operation[],
  newFetched: Operation[]
): Operation[] {
  const ids = existing.map((o) => o.id);
  const all = newFetched.filter((o) => !ids.includes(o.id)).concat(existing);
  return uniqBy(
    all.sort((a, b) => b.date - a.date),
    "id"
  );
}

export const makeSync = (
  getAccountShape: GetAccountShape,
  postSync: (Account) => Account = (a) => a
): $PropertyType<AccountBridge<any>, "sync"> => (
  initial,
  syncConfig
): Observable<AccountUpdater> =>
  Observable.create((o) => {
    async function main() {
      const accountId = `js:2:${initial.currency.id}:${initial.freshAddress}:${initial.derivationMode}`;
      try {
        const shape = await getAccountShape(
          {
            currency: initial.currency,
            id: accountId,
            address: initial.freshAddress,
            initialAccount: initial,
          },
          syncConfig
        );
        o.next((a) => {
          const operations = mergeOps(a.operations, shape.operations || []);
          return postSync({
            ...a,
            id: accountId,
            spendableBalance: shape.balance || a.balance,
            operationsCount: shape.operationsCount || operations.length,
            lastSyncDate: new Date(),
            creationDate:
              operations.length > 0
                ? operations[operations.length - 1].date
                : new Date(),
            ...shape,
            operations,
            pendingOperations: a.pendingOperations.filter((op) =>
              shouldRetainPendingOperation(a, op)
            ),
          });
        });
        o.complete();
      } catch (e) {
        o.error(e);
      }
    }
    main();
  });

export const makeScanAccounts = (
  getAccountShape: GetAccountShape
): $PropertyType<CurrencyBridge, "scanAccounts"> => ({
  currency,
  deviceId,
  syncConfig,
}): Observable<ScanAccountEvent> =>
  Observable.create((o) => {
    let finished = false;
    const unsubscribe = () => {
      finished = true;
    };

    const derivationsCache = {};

    // in future ideally what we want is:
    // return mergeMap(addressesObservable, address => fetchAccount(address))

    async function stepAccount(
      index,
      { address, path: freshAddressPath },
      derivationMode,
      seedIdentifier
    ): Promise<?Account> {
      const accountId = `js:2:${currency.id}:${address}:${derivationMode}`;
      const accountShape: Account = await getAccountShape(
        {
          currency,
          id: accountId,
          address,
        },
        syncConfig
      );
      if (finished) return;

      const freshAddress = address;
      const operations = accountShape.operations || [];
      const operationsCount = accountShape.operationsCount || operations.length;
      const creationDate =
        operations.length > 0
          ? operations[operations.length - 1].date
          : new Date();
      const balance = accountShape.balance || BigNumber(0);
      const spendableBalance = accountShape.spendableBalance || BigNumber(0);

      if (balance.isNaN()) throw new Error("invalid balance NaN");

      const account: Account = {
        type: "Account",
        id: accountId,
        seedIdentifier,
        freshAddress,
        freshAddressPath,
        freshAddresses: [
          {
            address: freshAddress,
            derivationPath: freshAddressPath,
          },
        ],
        derivationMode,
        name: "",
        starred: false,
        index,
        currency,
        operationsCount,
        operations: [],
        pendingOperations: [],
        unit: currency.units[0],
        lastSyncDate: new Date(),
        creationDate,
        // overrides
        balance,
        spendableBalance,
        blockHeight: 0,
        ...accountShape,
      };

      return account;
    }

    async function main() {
      // TODO switch to withDevice
      let transport;
      try {
        transport = await open(deviceId);
        const derivationModes = getDerivationModesForCurrency(currency);
        for (const derivationMode of derivationModes) {
          const path = getSeedIdentifierDerivation(currency, derivationMode);
          log(
            "scanAccounts",
            `scanning ${currency.id} on derivationMode=${derivationMode}`
          );

          let result = derivationsCache[path];
          try {
            if (!result) {
              result = await getAddress(transport, {
                currency,
                path,
                derivationMode,
              });
              derivationsCache[path] = result;
            }
          } catch (e) {
            // feature detect any denying case that could happen
            if (
              e instanceof TransportStatusError ||
              e instanceof UserRefusedAddress
            ) {
              log("scanAccounts", "ignore derivationMode=" + derivationMode);
            }
          }
          if (!result) continue;

          const seedIdentifier = result.publicKey;

          let emptyCount = 0;
          const mandatoryEmptyAccountSkip = getMandatoryEmptyAccountSkip(
            derivationMode
          );
          const derivationScheme = getDerivationScheme({
            derivationMode,
            currency,
          });
          const showNewAccount = shouldShowNewAccount(currency, derivationMode);
          const stopAt = isIterableDerivationMode(derivationMode) ? 255 : 1;
          const startsAt = getDerivationModeStartsAt(derivationMode);
          for (let index = startsAt; index < stopAt; index++) {
            if (!derivationModeSupportsIndex(derivationMode, index)) continue;
            const freshAddressPath = runDerivationScheme(
              derivationScheme,
              currency,
              {
                account: index,
              }
            );

            let res = derivationsCache[freshAddressPath];
            if (!res) {
              res = await getAddress(transport, {
                currency,
                path: freshAddressPath,
                derivationMode,
              });
              derivationsCache[freshAddressPath] = res;
            }

            const account = await stepAccount(
              index,
              res,
              derivationMode,
              seedIdentifier
            );

            log(
              "scanAccounts",
              `scanning ${currency.id} at ${freshAddressPath}: ${
                res.address
              } resulted of ${
                account
                  ? `Account with ${account.operations.length} txs`
                  : "no account"
              }`
            );
            if (!account) return;

            const isEmpty = isAccountEmpty(account);

            account.name = isEmpty
              ? getNewAccountPlaceholderName({
                  currency,
                  index,
                  derivationMode,
                })
              : getAccountPlaceholderName({ currency, index, derivationMode });

            if (!isEmpty || showNewAccount) {
              o.next({ type: "discovered", account });
            }

            if (isEmpty) {
              if (emptyCount >= mandatoryEmptyAccountSkip) break;
              emptyCount++;
            }
          }
        }
        o.complete();
      } catch (e) {
        o.error(e);
      } finally {
        if (transport) {
          close(transport, deviceId);
        }
      }
    }

    main();

    return unsubscribe;
  });

export function makeAccountBridgeReceive({
  injectGetAddressParams,
}: {
  injectGetAddressParams?: (Account) => *,
} = {}): (
  account: Account,
  { verify?: boolean, deviceId: string, subAccountId?: string }
) => Observable<{
  address: string,
  path: string,
}> {
  return (account, { verify, deviceId }) => {
    const arg = {
      verify,
      currency: account.currency,
      derivationMode: account.derivationMode,
      path: account.freshAddressPath,
      ...(injectGetAddressParams && injectGetAddressParams(account)),
    };
    return withDevice(deviceId)((transport) =>
      from(
        getAddress(transport, arg).then((r) => {
          if (r.address !== account.freshAddress) {
            throw new WrongDeviceForAccount(
              `WrongDeviceForAccount ${account.name}`,
              {
                accountName: account.name,
              }
            );
          }
          return r;
        })
      )
    );
  };
}
