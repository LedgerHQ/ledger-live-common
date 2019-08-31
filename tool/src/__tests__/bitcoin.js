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
import "../live-common-setup";

import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";
implementLibcore({
  lib: () => require("@ledgerhq/ledger-core"), // eslint-disable-line global-require
  dbPath: process.env.LIBCORE_DB_PATH || "./libcoredb/bitcoin"
});

jest.setTimeout(120000);

describe("bitcoin transaction tests", () => {
  let account: Account = fromAccountRaw({
    id:
      "libcore:1:bitcoin:xpub6DEHKg8fgKcb9at2u9Xhjtx4tXGyWqUPQAx2zNCzr41gQRyCqpCn7onSoJU4VS96GXyCtAhhFxErnG2pGVvVexaqF7DEfqGGnGk7Havn7C2:native_segwit",
    seedIdentifier:
      "043188c7e9e184aa3f6c2967b9b2b19a5966efe88c526ac091687642540573ecfb4c988261e7b0b876c6aec0b393518676232b34289a5bfc0cc78cc2ef735fa512",
    name: "Bitcoin 2 (native segwit)",
    derivationMode: "native_segwit",
    index: 1,
    freshAddress: "bc1qwqfns0rs5zxrrwf80k4xlp4lpnuyc69feh2r3d",
    freshAddressPath: "84'/0'/1'/0/24",
    freshAddresses: [
      {
        address: "bc1qwqfns0rs5zxrrwf80k4xlp4lpnuyc69feh2r3d",
        derivationPath: "84'/0'/1'/0/24"
      }
    ],
    blockHeight: 0,
    operations: [],
    pendingOperations: [],
    currencyId: "bitcoin",
    unitMagnitude: 8,
    lastSyncDate: "",
    balance: "150084",
    xpub:
      "xpub6DEHKg8fgKcb9at2u9Xhjtx4tXGyWqUPQAx2zNCzr41gQRyCqpCn7onSoJU4VS96GXyCtAhhFxErnG2pGVvVexaqF7DEfqGGnGk7Havn7C2"
  });

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
      recipient: "dcovduyafuefmk2qvuw5xdtaunla2lp72n"
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
  });

  test("Valid recipient address should Succeed", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "39KaU7ksuQqmEGzLUCZzb9VYMm2H5yQ3QL"
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.recipientError).toEqual(null);
  });

  test("Missing Fees should have a FeeError", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "bc1qwqfns0rs5zxrrwf80k4xlp4lpnuyc69feh2r3d"
    };
    let status = await bridge.getTransactionStatus(account, t);
    expect(status.transactionError).toEqual(new FeeNotLoaded());
  });

  test("fees", async () => {
    let t = {
      ...bridge.createTransaction(account),
      recipient: "bc1qwqfns0rs5zxrrwf80k4xlp4lpnuyc69feh2r3d",
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
      recipient: "1FMpdbiC8dj7kHJ8tPWFcihvAcqEqramoN",
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
      recipient: "1FMpdbiC8dj7kHJ8tPWFcihvAcqEqramoN",
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
