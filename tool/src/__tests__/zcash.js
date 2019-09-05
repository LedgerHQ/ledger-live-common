// @flow

import "babel-polyfill";
import { BigNumber } from "bignumber.js";
import {
  InvalidAddress,
  FeeNotLoaded,
  FeeRequired,
  NotEnoughBalance
} from "@ledgerhq/errors";
import type { Account } from "@ledgerhq/live-common/lib/types";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import setupTest from "../live-common-setup-test";
import accountsJSON from "./libcoreAccounts.json";

setupTest("zcash");

describe("ZCash transaction tests", () => {
  let account: Account = fromAccountRaw(accountsJSON.zcash1);

  const bridge = getAccountBridge(account, null);

  beforeAll(async () => {
    account = await bridge
      .startSync(account, false)
      .toPromise()
      .then(f => f(account));
  });

  test("Missing recipient should have a recipientError", async () => {
    let t = {
      ...bridge.createTransaction(account)
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
  });

  test("Invalid recipient should have a recipientError", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "invalidADDRESS"
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
  });

  test("Lowercase recipient address should have a recipientError ", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "t1d1v4a8z4kykux44enzfssauadvwbhbvbz"
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
  });

  test("Valid recipient address should Succeed", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "t1d1V4a8Z4KYkux44eNZfSSAuadVWbHbVBz"
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(null);
  });

  test("Missing Fees should have a FeeError", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "t1gJ5fydzJKsTUkykzcVw1yDhHSc8FkULEB"
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.transactionError).toEqual(new FeeNotLoaded());
  });

  test("fees", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "t1gJ5fydzJKsTUkykzcVw1yDhHSc8FkULEB",
      amount: BigNumber(100),
      feePerByte: null
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(null);
    expect(status.transactionError).toEqual(new FeeNotLoaded());
    t = await bridge.prepareTransaction(account, t);
    expect(t.feePerByte).toBeInstanceOf(BigNumber);
    t.feePerByte = BigNumber(1); // for predictible tests
    status = await bridge.getTransactionStatus(account, t);
    expect(status.transactionError).toEqual(null);
    t = {
      ...t,
      feePerByte: BigNumber(0)
    };
    t = await bridge.prepareTransaction(account, t);
    status = await bridge.getTransactionStatus(account, t);
    expect(status.transactionError).toEqual(new FeeRequired());
  });

  test("Amount to high should have a balanceError", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "t1gJ5fydzJKsTUkykzcVw1yDhHSc8FkULEB",
      feePerByte: BigNumber(1),
      amount: BigNumber(979079019)
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(null);
    let transaction = await bridge.prepareTransaction(account, t);
    status = await bridge.getTransactionStatus(account, transaction);
    expect(status.transactionError).toEqual(new NotEnoughBalance());
    t = {
      ...t,
      feePerByte: BigNumber(9999999),
      amount: BigNumber(300)
    };
    status = await bridge.getTransactionStatus(account, t);
    transaction = await bridge.prepareTransaction(account, t);
    status = await bridge.getTransactionStatus(account, transaction);
    expect(status.transactionError).toEqual(new NotEnoughBalance());
  });

  test("Valid amount should Succeed", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "t1d1V4a8Z4KYkux44eNZfSSAuadVWbHbVBz",
      feePerByte: BigNumber(2),
      amount: BigNumber(2489)
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(null);
    let transaction = await bridge.prepareTransaction(account, t);
    status = await bridge.getTransactionStatus(account, transaction);
    expect(status.transactionError).toEqual(null);
  });
});
