// @flow
import { reduce } from "rxjs/operators";
import { setSupportedCurrencies } from "../../../currencies";
import { fromAccountRaw, toAccountRaw } from "../../../account";
import type { Account } from "../../../types";
import { getAccountBridge } from "../../../bridge";
import { makeBridgeCacheSystem } from "../../../bridge/cache";
import { ethereum1 } from "../test-dataset";
import { setEnv } from "../../../env";

setSupportedCurrencies(["ethereum"]);
setEnv("COMPOUND_API", "https://status.ledger.com"); // hack to hit an endpoint that actually is going to 404

test("if API is down, an account still sync fine", async () => {
  const account = fromAccountRaw(ethereum1);
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
  await cache.prepareCurrency(account.currency);
  const bridge = getAccountBridge(account);
  const synced = await bridge
    .sync(account, { paginationConfig: {} })
    .pipe(reduce((a, f: (Account) => Account) => f(a), account))
    .toPromise();
  expect(toAccountRaw(synced)).toMatchSnapshot();
});
