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

export interface RawPlatformTransactionCommon {
  amount: string;
  recipient: string;
}

export interface RawPlatformEthereumTransaction
  extends RawPlatformTransactionCommon {
  family: "ethereum";
  nonce: ?number;
  data: ?string;
  gasPrice: ?string;
  gasLimit: ?string;
}

export type RawPlatformTransaction = RawPlatformEthereumTransaction;
