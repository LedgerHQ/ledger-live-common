import "../test-helpers/staticTime";
import "../../load/tokens/ethereum/erc20";
import "../../load/tokens/tron/trc10";
import "../../load/tokens/tron/trc20";

import { genAccount } from "../../mock/account";
import { getBalanceHistory } from "../../portfolio";

test("generate an account from seed", () => {
  const a = genAccount("seed");
  const b = genAccount("seed");
  expect(a).toEqual(b);
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
    const invalidDataPoints = history.filter(h => h.value.isNegative());
    expect(invalidDataPoints).toMatchObject([]);
  }
});
