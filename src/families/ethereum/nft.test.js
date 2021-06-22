// @flow
import "../../__tests__/test-helpers/setup";
import { reduce } from "rxjs/operators";
import { fromAccountRaw } from "../../account";
import type { Account } from "../../types";
import { getAccountBridge } from "../../bridge";
import { makeBridgeCacheSystem } from "../../bridge/cache";

describe("G4SP4RD account", () => {
  const account = fromAccountRaw({
    id: "js:1:ethereum:0xb98d10d9f6d07ba283bfd21b2dfec050f9ae282a:",
    seedIdentifier: "0xb98d10d9f6d07ba283bfd21b2dfec050f9ae282a",
    name: "G4SP4RD",
    derivationMode: "",
    index: 0,
    freshAddress: "0xb98d10d9f6d07ba283bfd21b2dfec050f9ae282a",
    freshAddressPath: "44'/60'/0'/0/0",
    freshAddresses: [],
    pendingOperations: [],
    operations: [],
    currencyId: "ethereum",
    unitMagnitude: 18,
    balance: "",
    blockHeight: 0,
    lastSyncDate: "",
    xpub: "",
  });
  let localCache = {};
  const cache = makeBridgeCacheSystem({
    saveData(c, d) {
      localCache[c.id] = d;
      return Promise.resolve();
    },
    getData(c) {
      return Promise.resolve(localCache[c.id]);
    },
  });

  test("prepare", async () => {
    await cache.prepareCurrency(account.currency);
  });

  test("nfts", async () => {
    const bridge = getAccountBridge(account);
    const blacklistedTokenIds = [];
    const synced = await bridge
      .sync(account, {
        paginationConfig: {},
        blacklistedTokenIds,
      })
      .pipe(reduce((a, f: (Account) => Account) => f(a), account))
      .toPromise();
    expect(synced.nfts.length).not.toEqual(0);
  });
});
