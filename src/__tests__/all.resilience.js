// @flow
import { setup } from "./test-helpers/libcore-setup";
import axios from "axios";
import dataset from "../generated/test-dataset";
import { disconnectAll } from "../api";
import { reduce, filter, map } from "rxjs/operators";
import type {
  Account,
  Transaction,
  AccountBridge,
  SyncConfig,
  DatasetTest,
} from "../types";
import { fromAccountRaw } from "../account";
import { getCryptoCurrencyById } from "../currencies";
import { getAccountBridge, getCurrencyBridge } from "../bridge";
import {
  mockDeviceWithAPDUs,
  releaseMockDevice,
} from "./test-helpers/mockDevice";
import { implicitMigration } from "../migrations/accounts";

afterAll(async () => {
  await disconnectAll();
});

setup("resilience");

jest.setTimeout(10000);

axios.interceptors.request.use(() => {
  throw new Error("stopping http query");
});

const defaultSyncConfig = {
  paginationConfig: {},
  blacklistedTokenIds: [],
};

Object.keys(dataset).map((family) => {
  if (family !== "bitcoin") return; // only do it for bitcoin family for now
  const data: DatasetTest<any> = dataset[family];
  describe("scanAccounts should fail quickly without network", () => {
    Object.keys(data.currencies).forEach((cid) => {
      const currencyData = data.currencies[cid];
      const currency = getCryptoCurrencyById(cid);
      const bridge = getCurrencyBridge(currency);

      const { scanAccounts, accounts } = currencyData;

      if (scanAccounts) {
        scanAccounts.forEach((scanAccount) => {
          test("scanAccounts " + scanAccount.name + " " + cid, () => {
            async function f() {
              const deviceId = mockDeviceWithAPDUs(scanAccount.apdus);
              try {
                const accounts = await bridge
                  .scanAccounts({
                    currency,
                    deviceId,
                    syncConfig: defaultSyncConfig,
                  })
                  .pipe(
                    filter((e) => e.type === "discovered"),
                    map((e) => e.account),
                    reduce((all, a) => all.concat(a), [])
                  )
                  .toPromise();

                return implicitMigration(accounts);
              } finally {
                releaseMockDevice(deviceId);
              }
            }

            return expect(f()).rejects.toBeDefined();
          });
        });
      }

      if (accounts) {
        accounts.forEach((accountData) => {
          const account = fromAccountRaw(accountData.raw);
          test("syncAccount " + account.name, () => {
            const bridge = getAccountBridge(account);
            return expect(syncAccount(bridge, account)).rejects.toBeDefined();
          });
        });
      }
    });
  });
});

export function syncAccount<T: Transaction>(
  bridge: AccountBridge<T>,
  account: Account,
  syncConfig: SyncConfig = defaultSyncConfig
): Promise<Account> {
  return bridge
    .sync(account, syncConfig)
    .pipe(reduce((a, f: (Account) => Account) => f(a), account))
    .toPromise();
}
