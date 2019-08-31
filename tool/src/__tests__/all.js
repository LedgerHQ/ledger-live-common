/* eslint-disable no-console */
// @flow

import "babel-polyfill";
import { BigNumber } from "bignumber.js";
import axios from "axios";
import {
  InvalidAddress,
  FeeNotLoaded,
  NotEnoughBalance
} from "@ledgerhq/errors";
import type {
  Account,
  AccountBridge,
  Transaction
} from "@ledgerhq/live-common/lib/types";
import { setEnv } from "@ledgerhq/live-common/lib/env";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import "../live-common-setup";

axios.interceptors.response.use(
  r => r,
  error => {
    console.log("http error", error.response.status, error.request.path);
    return Promise.reject(error);
  }
);

jest.setTimeout(120000);

const ethereum1: Account = fromAccountRaw({
  id:
    "libcore:1:ethereum:xpub6BemYiVNp19ZzH73tAbE9guoQcyygwpWgmrch2J2WsbJhxUSnjZXpMnAKru6wXK3AWxU2fywYBCdojmwnFL6qiH3ByqXpDJ2PKGijdaNvAb:",
  seedIdentifier:
    "046575fa4cc4274a90599226af2493b8bdaf978674dc777bac4c3ef1667792d7339ef42ce783c0c4d83306720015473897508ef6029e7400869ea515526f4394c9",
  name: "Ethereum 1",
  derivationMode: "",
  index: 0,
  freshAddress: "0x519192a437e6aeb895Cec72828A73B11b698dE3a",
  freshAddressPath: "44'/60'/0'/0/0",
  pendingOperations: [],
  currencyId: "ethereum",
  unitMagnitude: 18,
  balance: "48167391707119",
  xpub:
    "xpub6BemYiVNp19ZzH73tAbE9guoQcyygwpWgmrch2J2WsbJhxUSnjZXpMnAKru6wXK3AWxU2fywYBCdojmwnFL6qiH3ByqXpDJ2PKGijdaNvAb",
  tokenAccounts: [],
  operations: [],
  freshAddresses: [
    {
      address: "0x519192a437e6aeb895Cec72828A73B11b698dE3a",
      derivationPath: "44'/60'/0'/0/0"
    }
  ],
  lastSyncDate: "",
  blockHeight: 0
});

const xrp1: Account = fromAccountRaw({
  id: "ripplejs:2:ripple:rJfzRJHcM9qGuMdULGM7mU4RikqRY47FxR:",
  seedIdentifier: "rJfzRJHcM9qGuMdULGM7mU4RikqRY47FxR",
  name: "XRP 1",
  derivationMode: "",
  index: 0,
  freshAddress: "rJfzRJHcM9qGuMdULGM7mU4RikqRY47FxR",
  freshAddressPath: "44'/144'/0'/0/0",
  freshAddresses: [
    {
      address: "rJfzRJHcM9qGuMdULGM7mU4RikqRY47FxR",
      derivationPath: "44'/144'/0'/0/0"
    }
  ],
  pendingOperations: [],
  currencyId: "ripple",
  unitMagnitude: 6,
  balance: "20000000",
  operations: [],
  lastSyncDate: "",
  blockHeight: 0
});

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

const bridgeImplementations = {
  bitcoin: ["mock", ""],
  ethereum: ["mock", "js", "libcore"],
  xrp: ["mock", "js"]
};

// utility to test common behaviors shared on all bridges
const forEachDifferentBridge = async (
  f: (
    Account,
    AccountBridge<any>,
    { family: string, impl: string }
  ) => Promise<any>
) => {
  for (let account of [ethereum1, xrp1, bitcoin1]) {
    const { family } = account.currency;
    const impls = bridgeImplementations[family] || [""];
    for (let impl of impls) {
      setEnv("BRIDGE_FORCE_IMPLEMENTATION", impl);
      const bridge = getAccountBridge(account, null);
      console.log(family, impl);
      await f(account, bridge, { family, impl });
    }
  }
};

beforeEach(() => {
  setEnv("BRIDGE_FORCE_IMPLEMENTATION", "");
});

test("prepareTransaction called twice will return the same object reference", async () => {
  await forEachDifferentBridge(async (account, bridge) => {
    await bridge.startSync(account, false).toPromise();
    const t = bridge.createTransaction(account);
    const t2 = await bridge.prepareTransaction(account, t);
    const t3 = await bridge.prepareTransaction(account, t2);
    expect(t2).toBe(t3);
  });
});

test("invalid recipient have a recipientError", async () => {
  const bridge = getAccountBridge(bitcoin1, null);
  await bridge.startSync(bitcoin1, false).toPromise();
  const t: Transaction = {
    ...bridge.createTransaction(bitcoin1),
    recipient: "invalidADDRESS"
  };
  const status = await bridge.getTransactionStatus(bitcoin1, t);
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
