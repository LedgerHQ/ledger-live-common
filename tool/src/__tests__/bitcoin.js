// @flow

import "babel-polyfill";
import { BigNumber } from "bignumber.js";
import { InvalidAddress, FeeNotLoaded, FeeRequired, NotEnoughBalance } from "@ledgerhq/errors";
import type { Account, Transaction } from "@ledgerhq/live-common/lib/types";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import "../live-common-setup";

jest.setTimeout(120000);

const bitcoin1: Account = fromAccountRaw({
    id: "libcore:1:bitcoin:xpub6DEHKg8fgKcb9at2u9Xhjtx4tXGyWqUPQAx2zNCzr41gQRyCqpCn7onSoJU4VS96GXyCtAhhFxErnG2pGVvVexaqF7DEfqGGnGk7Havn7C2:native_segwit",
    seedIdentifier: "043188c7e9e184aa3f6c2967b9b2b19a5966efe88c526ac091687642540573ecfb4c988261e7b0b876c6aec0b393518676232b34289a5bfc0cc78cc2ef735fa512",
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
    xpub: "xpub6DEHKg8fgKcb9at2u9Xhjtx4tXGyWqUPQAx2zNCzr41gQRyCqpCn7onSoJU4VS96GXyCtAhhFxErnG2pGVvVexaqF7DEfqGGnGk7Havn7C2" 
});

const bridge = getAccountBridge(bitcoin1, null);

let t: Transaction = {
    ...bridge.createTransaction(bitcoin1)
};

beforeEach(async () => {
    await bridge.startSync(bitcoin1, false).toPromise();
});

test("Missing recipient should have a recipientError", async () => {
    t = {
        ...t
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
});

test("Invalid recipient should have a recipientError", async () => {
    t = {
        ...t,
        recipient: "invalidADDRESS"
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
});

test("Lowercase recipient address should have a recipientError ", async () => {
    t = {
        ...t,
        recipient: "dcovduyafuefmk2qvuw5xdtaunla2lp72n"
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.recipientError).toEqual(new InvalidAddress());
});

test("Valid recipient address should Succeed", async () => {
    t = {
        ...t,
        recipient: "39KaU7ksuQqmEGzLUCZzb9VYMm2H5yQ3QL"
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.recipientError).toEqual(null);
});

test("Missing Fees should have a FeeError", async () => {
    t ={
        ...t,
        recipient: "bc1qwqfns0rs5zxrrwf80k4xlp4lpnuyc69feh2r3d"
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.transactionError).toEqual(new FeeNotLoaded());
});

test("Fees null OR 0 should have a FeeError", async () => {
    t ={
        ...t,
        recipient: "bc1qwqfns0rs5zxrrwf80k4xlp4lpnuyc69feh2r3d",
        amount: BigNumber(0.0001),
        feePerByte: null
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.recipientError).toEqual(null);
    expect(status.transactionError).toEqual(new FeeRequired());
    let transaction = await bridge.prepareTransaction(bitcoin1, t);
    status = await bridge.getTransactionStatus(bitcoin1, transaction);
    expect(status.transactionError).toEqual(null);
    t ={
        ...t,
        feePerByte: BigNumber(0)
    };
    transaction = await bridge.prepareTransaction(bitcoin1, t);
    status = await bridge.getTransactionStatus(bitcoin1, transaction);
    expect(status.transactionError).toEqual(null);
});

test("Amount to high should have a balanceError", async () => {
    t ={
        ...t,
        recipient: "1FMpdbiC8dj7kHJ8tPWFcihvAcqEqramoN",
        feePerByte: BigNumber(1),
        amount: BigNumber(979079019)
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.recipientError).toEqual(null);
    let transaction = await bridge.prepareTransaction(bitcoin1, t);
    status = await bridge.getTransactionStatus(bitcoin1, transaction);
    expect(status.transactionError).toEqual(new NotEnoughBalance());
    t ={
        ...t,
        feePerByte: BigNumber(9999999),
        amount: BigNumber(300)
    };
    status = await bridge.getTransactionStatus(bitcoin1, t);
    transaction = await bridge.prepareTransaction(bitcoin1, t);
    status = await bridge.getTransactionStatus(bitcoin1, transaction);
    expect(status.transactionError).toEqual(new NotEnoughBalance());
});

test("Valid amount should Succeed", async () => {
    t ={
        ...t,
        recipient: "1FMpdbiC8dj7kHJ8tPWFcihvAcqEqramoN",
        feePerByte: BigNumber(2),
        amount: BigNumber(2489)
    };
    let status = await bridge.getTransactionStatus(bitcoin1, t);
    expect(status.recipientError).toEqual(null);
    let transaction = await bridge.prepareTransaction(bitcoin1, t);
    status = await bridge.getTransactionStatus(bitcoin1, transaction);
    expect(status.transactionError).toEqual(null);
});