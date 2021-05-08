// @flow

import type {
  RawPlatformAccount,
  RawPlatformTransaction,
  RawPlatformEthereumTransaction,
} from "./rawTypes";
import type {
  PlatformAccount,
  PlatformTransaction,
  PlatformEthereumTransaction,
} from "./types";

import { BigNumber } from "bignumber.js";

export function serializePlatformAccount(
  account: PlatformAccount
): RawPlatformAccount {
  return {
    id: account.id,
    name: account.name,
    address: account.address,
    currency: account.currency,
    balance: account.balance.toString(),
    spendableBalance: account.spendableBalance.toString(),
    blockHeight: account.blockHeight,
    lastSyncDate: account.lastSyncDate.toString(),
  };
}

export function deserializePlatformAccount(
  rawAccount: RawPlatformAccount
): PlatformAccount {
  return {
    id: rawAccount.id,
    name: rawAccount.name,
    address: rawAccount.address,
    currency: rawAccount.currency,
    balance: new BigNumber(rawAccount.balance),
    spendableBalance: new BigNumber(rawAccount.spendableBalance),
    blockHeight: rawAccount.blockHeight,
    lastSyncDate: new Date(rawAccount.lastSyncDate),
  };
}

export function serializePlatformEthereumTransaction(
  transaction: PlatformEthereumTransaction
): RawPlatformEthereumTransaction {
  return {
    family: transaction.family,
    amount: transaction.amount.toString(),
    recipient: transaction.recipient,
    nonce: transaction.nonce,
    data: transaction.data ? transaction.data.toString() : undefined,
    gasPrice: transaction.gasPrice
      ? transaction.gasPrice.toString()
      : undefined,
    gasLimit: transaction.gasLimit
      ? transaction.gasLimit.toString()
      : undefined,
  };
}

export function deserializePlatformEthereumTransaction(
  rawTransaction: RawPlatformEthereumTransaction
): PlatformEthereumTransaction {
  return {
    family: rawTransaction.family,
    amount: new BigNumber(rawTransaction.amount),
    recipient: rawTransaction.recipient,
    nonce: rawTransaction.nonce,
    data: rawTransaction.data ? Buffer.from(rawTransaction.data) : undefined,
    gasPrice: rawTransaction.gasPrice
      ? new BigNumber(rawTransaction.gasPrice)
      : undefined,
    gasLimit: rawTransaction.gasLimit
      ? new BigNumber(rawTransaction.gasLimit)
      : undefined,
  };
}

export function serializePlatformTransaction(
  transaction: PlatformTransaction
): RawPlatformTransaction {
  if (transaction.family === "ethereum") {
    return serializePlatformEthereumTransaction(transaction);
  }
  throw new Error(`Can't serialize ${transaction.family} transactions`);
}

export function deserializePlatformTransaction(
  rawTransaction: RawPlatformTransaction
): PlatformTransaction {
  if (rawTransaction.family === "ethereum") {
    return deserializePlatformEthereumTransaction(rawTransaction);
  }

  throw new Error(`Can't deserialize ${rawTransaction.family} transactions`);
}
