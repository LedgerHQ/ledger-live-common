// @flow

import "babel-polyfill";
import { BigNumber } from "bignumber.js";
import { InvalidAddress, NotEnoughBalance } from "@ledgerhq/errors";
import type { Account, Transaction } from "@ledgerhq/live-common/lib/types";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import "../live-common-setup";

import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";
implementLibcore({
  lib: () => require("@ledgerhq/ledger-core"), // eslint-disable-line global-require
  dbPath: process.env.LIBCORE_DB_PATH || "./libcoredb/ethereum"
});

jest.setTimeout(120000);

describe("ethereum transaction tests", () => {
  let account: Account = fromAccountRaw({
    id:
      "libcore:1:ethereum:xpub6BemYiVNp19a1XgWqLcpWd1pBDZTgzPEcVvhR15cpXPVQjuEnrU7fa3TUatX2NbRWNkqx51jmyukisqGokHq5dyK5uYcbwQBF7nJyAdpYZy:",
    seedIdentifier:
      "xpub6BemYiVNp19a1XgWqLcpWd1pBDZTgzPEcVvhR15cpXPVQjuEnrU7fa3TUatX2NbRWNkqx51jmyukisqGokHq5dyK5uYcbwQBF7nJyAdpYZy",
    name: "Ethereum legacy xpub6Bem...JyAdpYZy",
    derivationMode: "",
    index: 0,
    freshAddress: "0x0E3F0bb9516F01f2C34c25E0957518b8aC9414c5",
    freshAddressPath: "44'/60'/0'/0/0",
    freshAddresses: [],
    pendingOperations: [],
    operations: [],
    currencyId: "ethereum",
    unitMagnitude: 18,
    balance: "",
    blockHeight: 0,
    lastSyncDate: "",
    xpub:
      "xpub6BemYiVNp19a1XgWqLcpWd1pBDZTgzPEcVvhR15cpXPVQjuEnrU7fa3TUatX2NbRWNkqx51jmyukisqGokHq5dyK5uYcbwQBF7nJyAdpYZy"
  });

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
