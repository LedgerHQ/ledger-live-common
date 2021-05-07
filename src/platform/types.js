// @flow

import type { BigNumber } from "bignumber.js";

export type PlatformAccount = {
  id: string,
  name: string,
  address: string,
  currency: string,
  balance: BigNumber,
  spendableBalance: BigNumber,
  blockHeight: number,
  lastSyncDate: Date,
};

export type PlatformUnit = {
  name: string,
  code: string,
  magnitude: number,
};

export type PlatformCurrency = {
  type: string,
  color: string,
  ticker: string,
  id: string,
  name: string,
  family: string,
  units: PlatformUnit[],
};

export type PlatformTransactionCommon = {
  family: string,
  amount: BigNumber,
  recipient: string,
};

export type PlatformEthereumTransaction = {
  family: "ethereum",
  nonce?: number,
  data?: Buffer,
  gasPrice: ?BigNumber,
  gasLimit: ?BigNumber,
};

export type PlatformTransaction = PlatformTransactionCommon &
  PlatformEthereumTransaction;
