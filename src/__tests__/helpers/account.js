// @flow
import { BigNumber } from "bignumber.js";
import flatMap from "lodash/flatMap";
import {
  getFiatCurrencyByTicker,
  getCryptoCurrencyById
} from "../../currencies";
import {
  groupAccountOperationsByDay,
  groupAccountsOperationsByDay,
  shortAddressPreview
} from "../../account";
import { genAccount } from "../../mock/account";

test("groupAccountOperationsByDay", () => {
  const account = genAccount("seed_7");
  const res1 = groupAccountOperationsByDay(account, { count: 10 });
  expect(res1.completed).toBe(false);
  expect(res1).toMatchSnapshot();
  const res2 = groupAccountOperationsByDay(account, { count: Infinity });
  expect(res2.completed).toBe(true);
  expect(
    // $FlowFixMe
    flatMap(res2.sections, s => s.data).slice(0, 10)
  ).toMatchObject(
    // $FlowFixMe
    flatMap(res1.sections, s => s.data)
  );
});

test("groupAccountsOperationsByDay", () => {
  const accounts = Array(10)
    .fill(null)
    .map((_, i) => genAccount("gaobd" + i));
  const res1 = groupAccountsOperationsByDay(accounts, { count: 100 });
  expect(res1.completed).toBe(false);
  expect(res1).toMatchSnapshot();
  const res2 = groupAccountsOperationsByDay(accounts, { count: Infinity });
  expect(res2.completed).toBe(true);
  expect(
    // $FlowFixMe
    flatMap(res2.sections, s => s.data).slice(0, 100)
  ).toMatchObject(
    // $FlowFixMe
    flatMap(res1.sections, s => s.data)
  );
});

test("groupAccountsOperationsByDay provide at least the requested count even if some op yield nothing", () => {
  const ethAccount = genAccount("eth_1", {
    currency: getCryptoCurrencyById("ethereum"),
    operationsSize: 300
  });
  ethAccount.operations = Array(50)
    .fill({
      ...ethAccount.operations[0],
      value: BigNumber(0),
      type: "NONE"
    })
    .concat(ethAccount.operations);

  const res1 = groupAccountOperationsByDay(ethAccount, { count: 100 });
  expect(res1.completed).toBe(false);
  expect(
    res1.sections.reduce((acc, s) => acc.concat(s.data), []).length
  ).toBeGreaterThanOrEqual(100);
});

test("shortAddressPreview", () => {
  expect(
    shortAddressPreview("0x112233445566778899001234567890aAbBcCdDeEfF")
  ).toBe("0x112233...cCdDeEfF");
  expect(
    shortAddressPreview("0x112233445566778899001234567890aAbBcCdDeEfF", 30)
  ).toBe("0x11223344556...0aAbBcCdDeEfF");
});

test("groupAccountOperationsByDay to dedup", () => {
  const account = genAccount("seed_8");
  account.pendingOperations = account.operations.slice(0, 3);
  const accountClone = genAccount("seed_8");
  const res1 = groupAccountOperationsByDay(account, { count: 100 });
  const res2 = groupAccountOperationsByDay(accountClone, { count: 100 });
  expect(res1).toMatchObject(res2);
});
