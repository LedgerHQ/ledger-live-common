// @flow

import { log } from "@ledgerhq/logs";
import axios from "axios";
import { setup } from "./test-helpers/libcore-setup";
import { withLibcore, afterLibcoreGC } from "../libcore/access";
import { delay } from "../promise";
import { testBridge } from "./test-helpers/bridge";
import dataset from "../generated/test-dataset";
import specifics from "../generated/test-specifics";
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

// Disconnect all api clients that could be open.
afterAll(async () => {
  await disconnectAll();
});

setup("libcore");

let shouldStopNetwork = false;
axios.interceptors.request.use((r) => {
  if (shouldStopNetwork) throw new Error("stopping http query");
  return r;
});

test("libcore version", async () => {
  const v = await withLibcore((core) => core.LedgerCore.getStringVersion());
  expect(typeof v).toBe("string");
  log("libcoreVersion", v);
});

const families = Object.keys(dataset);
const maybeFamilyToOnlyRun =
  process.env.BRANCH && process.env.BRANCH.split("/")[0];
const shouldExcludeFamilies =
  maybeFamilyToOnlyRun && families.includes(maybeFamilyToOnlyRun);

// covers all bridges through many different accounts
// to test the common shared properties of bridges.
// const all =
families
  .map((family) => {
    if (process.env.FAMILY && process.env.FAMILY !== family) return;
    if (shouldExcludeFamilies && maybeFamilyToOnlyRun !== family) return;
    const data: DatasetTest<any> = dataset[family];
    return testBridge(family, data);
  })
  .filter(Boolean);

// FIXME overkill atm but could help perf
/*
const MAX_CONCURRENT = 2;
from(flatMap(all, r => r.preloadObservables))
  .pipe(mergeAll(MAX_CONCURRENT))
  .subscribe();
*/

Object.values(specifics).forEach((specific: Function) => {
  specific();
});

describe("libcore access", () => {
  test("withLibcore", async () => {
    const res = await withLibcore(async (core) => {
      expect(core).toBeDefined();
      await delay(100);
      return 42;
    });
    expect(res).toBe(42);
  });

  test("afterLibcoreGC", async () => {
    let count = 0;
    let gcjob = 0;

    withLibcore(async () => {
      await delay(100);
      ++count;
    });

    withLibcore(async () => {
      await delay(100);
      ++count;
    });

    let p3;

    await delay(20);

    await afterLibcoreGC(async () => {
      expect(count).toBe(2);
      await delay(100);
      p3 = withLibcore(async () => {
        await delay(400);
        ++count;
      });
      expect(count).toBe(2);
      await delay(100);
      expect(count).toBe(2);
      gcjob++;
    });

    await p3;

    expect(count).toBe(3);
    expect(gcjob).toBe(1);
  });
});

const defaultSyncConfig = {
  paginationConfig: {},
  blacklistedTokenIds: [],
};

Object.keys(dataset).map((family) => {
  if (family !== "bitcoin") return; // only do it for bitcoin family for now
  const data: DatasetTest<any> = dataset[family];
  describe("scanAccounts should fail quickly without network", () => {
    beforeEach(() => {
      shouldStopNetwork = true;
    });
    afterEach(() => {
      shouldStopNetwork = false;
    });
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

function syncAccount<T: Transaction>(
  bridge: AccountBridge<T>,
  account: Account,
  syncConfig: SyncConfig = defaultSyncConfig
): Promise<Account> {
  return bridge
    .sync(account, syncConfig)
    .pipe(reduce((a, f: (Account) => Account) => f(a), account))
    .toPromise();
}
