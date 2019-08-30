// @flow

import "babel-polyfill";
import { BigNumber } from "bignumber.js";
import { InvalidAddress, FeeNotLoaded, NotEnoughBalance } from "@ledgerhq/errors";
import type { Account, Transaction } from "@ledgerhq/live-common/lib/types";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import "../live-common-setup";

jest.setTimeout(120000);

const bitcoin1: Account = fromAccountRaw({
  id:
    "libcore:1:bitcoin:xpub6Bm5P7Xyx2UYrVBAgb54gEswXhbZaryZSWsPjeJ1jpb9K9S5UTD5z5cXW4EREkTqkNjSHQHxwHKZJVE7TFvftySnKabMAXAQCMSVJBdJxMC:",
  seedIdentifier:
    "04b9b3078fbdef02b5f5aa8bb400423d5170015da06c31ad7745160cbab1fa4cdc965f271b924c2999639211310f6d35029698749b38ea7e64608de3ebcdbaa46a",
  name: "Bitcoin 1 (legacy)",
  derivationMode: "",
  index: 0,
  freshAddress: "1ATftUjdUKXQX6bBPzARUqongDWjNCLMhH",
  freshAddressPath: "44'/0'/0'/0/82",
  freshAddresses: [
    {
      address: "1ATftUjdUKXQX6bBPzARUqongDWjNCLMhH",
      derivationPath: "44'/0'/0'/0/82"
    }
  ],
  pendingOperations: [],
  operations: [],
  currencyId: "bitcoin",
  unitMagnitude: 8,
  balance: "2825",
  blockHeight: 0,
  lastSyncDate: "",
  xpub:
    "xpub6Bm5P7Xyx2UYrVBAgb54gEswXhbZaryZSWsPjeJ1jpb9K9S5UTD5z5cXW4EREkTqkNjSHQHxwHKZJVE7TFvftySnKabMAXAQCMSVJBdJxMC"
});

const doge1: Account = fromAccountRaw({
  id:
    "libcore:1:dogecoin:dgub8rBqrhN2grbuDNuFBCu9u9KQKgQmkKaa15Yvnf4YznmvqFZByDPJypigogDKanefhrjj129Ek1W13zvtyQSD6HDpzxyskJvU6xmhD29S9eF:",
  seedIdentifier:
    "044c892c19c1873fa73dabee9942e551fafe49d3fd12dacd6a25c421d7c712bc136c61295d195ded6d366121cfe0a1aa2a1df548680fbfcabe868233bc12e2d772",
  name: "Dogecoin 1",
  derivationMode: "",
  index: 0,
  freshAddress: "DCovDUyAFueFmK2QVuW5XDtaUNLa2LP72n",
  freshAddressPath: "44'/3'/0'/0/6",
  freshAddresses: [
    {
      address: "DCovDUyAFueFmK2QVuW5XDtaUNLa2LP72n",
      derivationPath: "44'/3'/0'/0/6"
    }
  ],
  blockHeight: 2869296,
  operations: [],
  pendingOperations: [],
  currencyId: "dogecoin",
  unitMagnitude: 8,
  lastSyncDate: "2019-08-27T15:32:24.159Z",
  balance: "286144149366",
  xpub:
    "dgub8rBqrhN2grbuDNuFBCu9u9KQKgQmkKaa15Yvnf4YznmvqFZByDPJypigogDKanefhrjj129Ek1W13zvtyQSD6HDpzxyskJvU6xmhD29S9eF"
});

test("invalid recipient OR valid recipient lowercase have a recipientError", async () => {
  const bridge = getAccountBridge(bitcoin1, null);
  await bridge.startSync(bitcoin1, false).toPromise();
  let t: Transaction = {
    ...bridge.createTransaction(bitcoin1),
    recipient: "invalidADDRESS"
  };
  let status = await bridge.getTransactionStatus(bitcoin1, t);
  expect(status.recipientError).toEqual(new InvalidAddress());
  t = {
    ...bridge.createTransaction(bitcoin1),
    recipient: "dcovduyafuefmk2qvuw5xdtaunla2lp72n"
  };
  status = await bridge.getTransactionStatus(bitcoin1, t);
  expect(status.recipientError).toEqual(new InvalidAddress());
});

test("valid recipient should succeed", async () => {
  const bridge = getAccountBridge(doge1, null);
  await bridge.startSync(doge1, false).toPromise();
  let t = {
    ...bridge.createTransaction(doge1),
    amount: BigNumber(10000),
    recipient: "DCovDUyAFueFmK2QVuW5XDtaUNLa2LP72n"
  };
  let status = await bridge.getTransactionStatus(doge1, t);
  expect(status.transactionError).toEqual(new FeeNotLoaded());
  t = await bridge.prepareTransaction(doge1, t);
  status = await bridge.getTransactionStatus(doge1, t);
  expect(status.transactionError).toEqual(null);
  expect(status.recipientError).toEqual(null);
});

test("insufficient balance have an error", async () => {
  const bridge = getAccountBridge(bitcoin1, null);
  await bridge.startSync(bitcoin1, false).toPromise();
  let t = {
    ...bridge.createTransaction(bitcoin1),
    amount: BigNumber(1),
    recipient: "1ATftUjdUKXQX6bBPzARUqongDWjNCLMhH"
  };
  let status = await bridge.getTransactionStatus(bitcoin1, t);
  expect(status.transactionError).toEqual(new FeeNotLoaded());
  t = await bridge.prepareTransaction(bitcoin1, t);
  status = await bridge.getTransactionStatus(bitcoin1, t);
  expect(status.transactionError).toEqual(new NotEnoughBalance());
});

test("fees amount to high have an error", async () => {
  const bridge = getAccountBridge(doge1, null);
  await bridge.startSync(doge1, false).toPromise();
  let t = {
    ...bridge.createTransaction(doge1),
    amount: BigNumber(10000),
    recipient: "DCovDUyAFueFmK2QVuW5XDtaUNLa2LP72n"
  };
  let status = await bridge.getTransactionStatus(doge1, t);
  expect(status.transactionError).toEqual(new FeeNotLoaded());
  t = {
    ...bridge.createTransaction(doge1),
    amount: BigNumber(10000),
    recipient: "DCovDUyAFueFmK2QVuW5XDtaUNLa2LP72n",
    feePerByte: BigNumber(999999999)
  };
  t = await bridge.prepareTransaction(doge1, t);
  status = await bridge.getTransactionStatus(doge1, t);
  expect(status.transactionError).toEqual(new NotEnoughBalance());
});