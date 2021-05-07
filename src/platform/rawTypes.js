// @flow

export type RawPlatformAccount = {
  id: string,
  name: string,
  address: string,
  currency: string,
  balance: string,
  spendableBalance: string,
  blockHeight: number,
  lastSyncDate: string,
};

export type RawPlatformTransactionCommon = {
  family: string,
  amount: string,
  recipient: string,
};

export type RawPlatformEthereumTransaction = {
  family: "ethereum",
  nonce?: number,
  data?: string,
  gasPrice: ?string,
  gasLimit: ?string,
};

export type RawPlatformTransaction = RawPlatformTransactionCommon &
  RawPlatformEthereumTransaction;
