// @flow

import "babel-polyfill";
import { BigNumber } from "bignumber.js";
import { InvalidAddress, NotEnoughBalance } from "@ledgerhq/errors";
import type { Account, Transaction } from "@ledgerhq/live-common/lib/types";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import { setup } from "../live-common-setup-test";
import dataset from "@ledgerhq/live-common/lib/generated/test-dataset";

setup("ethereum");

describe("ethereum transaction tests", () => {
  let account: Account = fromAccountRaw(
    dataset.ethereum.currencies.ethereum.accounts[1].raw
  );

  const bridge = getAccountBridge(account, null);

  beforeAll(async () => {
    account = await bridge
      .startSync(account, false)
      .toPromise()
      .then(f => f(account));
  });

  test("invalid recipient have a recipientError", async () => {
    const t: Transaction = {
      ...bridge.createTransaction(account),
      recipient: "invalidADDRESS"
    };
    const status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
  });

  test("valid recipient OR valid recipient lowercase should succeed", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "0x5df0C369641B8Af3c7e9ae076E5466eF678319Cd"
    };
    let status = await bridge.getTransactionStatus(account, t);
    t = await bridge.prepareTransaction(account, t);
    status = await bridge.getTransactionStatus(account, t);
    expect(status.transactionError).toEqual(null);
    expect(status.recipientError).toEqual(null);
    t = {
      ...bridge.createTransaction(account),
      recipient: "0x5df0c369641b8af3c7e9ae076e5466ef678319cd"
    };
    t = await bridge.prepareTransaction(account, t);
    status = await bridge.getTransactionStatus(account, t);
    expect(status.transactionError).toEqual(null);
    expect(status.recipientError).toEqual(null);
  });

  test("insufficient balance have an error", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "0x5df0C369641B8Af3c7e9ae076E5466eF678319Cd",
      amount: BigNumber(
        9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
      )
    };
    t = await bridge.prepareTransaction(account, t);
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.transactionError).toEqual(new NotEnoughBalance());
  });
});
