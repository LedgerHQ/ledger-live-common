// @flow
import "../__tests__/test-helpers/setup";
import { reduce } from "rxjs/operators";
import { fromAccountRaw } from "../account";
import type { Account } from "../types";
import { getAccountBridge } from "../bridge";
import { makeBridgeCacheSystem } from "../bridge/cache";
import { aggregateNFTs, sortFilterNFTs } from ".";

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

  let syncP;
  function getAccountP() {
    if (syncP) return syncP;

    const bridge = getAccountBridge(account);
    syncP = cache.prepareCurrency(account.currency).then(() =>
      bridge
        .sync(account, {
          paginationConfig: {},
          blacklistedTokenIds: [],
        })
        .pipe(reduce((a, f: (Account) => Account) => f(a), account))
        .toPromise()
    );
    return syncP;
  }

  test("nfts are present", async () => {
    const synced = await getAccountP();
    expect(synced.nfts.length).not.toBe(0);
  });

  test("filter by account id invalid is empty", async () => {
    const synced = await getAccountP();
    expect(
      sortFilterNFTs(aggregateNFTs([synced]), {
        sortBy: "newest",
        searchQuery: "",
        filterByAccountId: "foo",
        filterByCurrencyId: null,
        filterByPlatformId: null,
        filterByCollectionSlug: null,
      }).length
    ).toBe(0);
  });

  test("filter by currency id not used is empty", async () => {
    const synced = await getAccountP();
    expect(
      sortFilterNFTs(aggregateNFTs([synced]), {
        sortBy: "newest",
        searchQuery: "",
        filterByAccountId: null,
        filterByCurrencyId: "neo",
        filterByPlatformId: null,
        filterByCollectionSlug: null,
      }).length
    ).toBe(0);
  });

  test("filter by platform id not used is empty", async () => {
    const synced = await getAccountP();
    expect(
      sortFilterNFTs(aggregateNFTs([synced]), {
        sortBy: "newest",
        searchQuery: "",
        filterByAccountId: null,
        filterByCurrencyId: null,
        filterByPlatformId: "INVALID",
        filterByCollectionSlug: null,
      }).length
    ).toBe(0);
  });

  test("filter by collection slug not used is empty", async () => {
    const synced = await getAccountP();
    expect(
      sortFilterNFTs(aggregateNFTs([synced]), {
        sortBy: "newest",
        searchQuery: "",
        filterByAccountId: null,
        filterByCurrencyId: null,
        filterByPlatformId: null,
        filterByCollectionSlug: "INVALID",
      }).length
    ).toBe(0);
  });

  test("no filtering have no changes on length", async () => {
    const synced = await getAccountP();
    const sorted = sortFilterNFTs(aggregateNFTs([synced]), {
      sortBy: "newest",
      searchQuery: "",
      filterByAccountId: null,
      filterByCurrencyId: null,
      filterByPlatformId: null,
      filterByCollectionSlug: null,
    });
    expect(sorted.length).toBe(synced.nfts.length);
  });

  test("search exactly a title", async () => {
    const synced = await getAccountP();
    const sorted = sortFilterNFTs(aggregateNFTs([synced]), {
      sortBy: "newest",
      searchQuery: "The three spatial dimensions, to which we can add time",
      filterByAccountId: null,
      filterByCurrencyId: null,
      filterByPlatformId: null,
      filterByCollectionSlug: null,
    });
    expect(sorted.length).toBe(1);
  });

  test("search exactly account id", async () => {
    const synced = await getAccountP();
    const sorted = sortFilterNFTs(aggregateNFTs([synced]), {
      sortBy: "newest",
      searchQuery: "",
      filterByAccountId: account.id,
      filterByCurrencyId: null,
      filterByPlatformId: null,
      filterByCollectionSlug: null,
    });
    expect(sorted.length).toBe(synced.nfts.length);
  });
});
