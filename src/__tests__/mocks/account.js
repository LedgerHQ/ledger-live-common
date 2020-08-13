import "../test-helpers/staticTime";
import "../../load/tokens/ethereum/erc20";
import "../../load/tokens/tron/trc10";
import "../../load/tokens/tron/trc20";
import "../../load/tokens/algorand/asa";

import { genAccount } from "../../mock/account";
import { getBalanceHistory } from "../../portfolio";
import { getEnv, setEnv } from "../../env";
import { findCryptoCurrencyById } from "../../data/cryptocurrencies";
import { canBeMigrated } from "../../account";

test("generate an account from seed", () => {
  const a = genAccount("seed");
  const b = genAccount("seed");
  expect(a).toEqual(b);
});

test("generate an account from different seed should generate a different account", () => {
  const a = genAccount(getEnv("MOCK"));
  setEnv("MOCK", "çacestvraiça");
  const b = genAccount(getEnv("MOCK"));
  expect(a).not.toEqual(b);
});

test("generate an account eligible to be migrated for mocked currencies", () => {
  setEnv("MOCK", "#-extexist");
  const mock = getEnv("MOCK");

  expect(
    canBeMigrated(
      genAccount(`${mock}_0`, {
        currency: findCryptoCurrencyById("ethereum_classic"),
      })
    )
  ).toBeFalsy(); // only the third mock account should be
  expect(
    canBeMigrated(
      genAccount(`${mock}_2`, {
        currency: findCryptoCurrencyById("ethereum_classic"), // should ignore libcore's no-go
      })
    )
  ).toBeTruthy();
  expect(
    canBeMigrated(
      genAccount(`${mock}_2`, {
        currency: findCryptoCurrencyById("dogecoin"),
      })
    )
  ).toBeTruthy();
});

test("generate no migratable accounts for other currencies", () => {
  setEnv("MOCK", "MOCK");
  const mock = getEnv("MOCK");
  expect(
    canBeMigrated(
      genAccount(`${mock}_2`, {
        currency: findCryptoCurrencyById("bitcoin"),
      })
    )
  ).toBeFalsy();
  expect(
    canBeMigrated(
      genAccount(`${mock}_2`, {
        currency: findCryptoCurrencyById("ethereum"),
      })
    )
  ).toBeFalsy();
  expect(
    canBeMigrated(
      genAccount(`${mock}_2`, {
        currency: findCryptoCurrencyById("tezos"),
      })
    )
  ).toBeFalsy();
});

test("generate no migratable accounts if not mock", () => {
  setEnv("MOCK", "");
  const mock = getEnv("MOCK");
  expect(
    canBeMigrated(
      genAccount(`${mock}_2`, {
        currency: findCryptoCurrencyById("dogecoin"),
      })
    )
  ).toBeFalsy();
  expect(
    canBeMigrated(
      genAccount(`${mock}_2`, {
        currency: findCryptoCurrencyById("ethereum_classic"),
      })
    )
  ).toBeFalsy();
});

test("dont generate negative balance", () => {
  const a = genAccount("n"); // <= with just prando, this seed generates negative balance
  expect(a.balance.isNegative()).toBe(false);
});

test("allow specifying number of operations", () => {
  const a = genAccount("n", { operationsSize: 10 });
  expect(a.operations.length).toBe(10);
});

// NB we can't guarantee that. bug in implementation because JS Numbers
test("mock generators don't generate negative balances", () => {
  for (let i = 0; i < 100; i++) {
    const account = genAccount("negative?" + i);
    const history = getBalanceHistory(account, "year");
    const invalidDataPoints = history.filter((h) => h.value.isNegative());
    expect(invalidDataPoints).toMatchObject([]);
  }
});
