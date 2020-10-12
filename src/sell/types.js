// @flow

import { BigNumber } from "bignumber.js";
import type { Account, AccountLike } from "../types/account";
import type {
  Operation,
  Transaction,
  CryptoCurrency,
  TokenCurrency,
  TransactionRaw,
} from "../types";

export type InitSellResult = {
  transaction: Transaction,
  sellId: string,
};

type ValidSellStatus =
  | "confirming"
  | "finished"
  | "exchanging"
  | "hold"
  | "sending"
  | "waiting"
  | "overdue"
  | "refunded"
  | "new"
  | "expired"
  | "failed";

export type SellStatusRequest = {
  provider: string,
  sellId: string,
};

export type SellStatus = {
  provider: string,
  sellId: string,
  status: ValidSellStatus,
};

export type GetStatus = (SellStatusRequest) => Promise<SellStatus>;
export type UpdateAccountSellStatus = (AccountLike) => Promise<?AccountLike>;
export type GetMultipleStatus = (SellStatusRequest[]) => Promise<SellStatus[]>;

/*
// TO BE FIGURED OUT
type FamilySellSpecifics = {
   getSerializedAddressParams: ?? => ??,
   signatures: Buffer
}
*/

// bridge.signOperation
// bridge.broadcast => Operation

export type SellRequestEvent =
  | { type: "init-sell-requested" }
  | { type: "init-sell-error", error: Error }
  | { type: "init-sell-result", initSellResult: InitSellResult };

export type SellHistorySection = {
  day: Date,
  data: MappedSellOperation[],
};

export type MappedSellOperation = {
  fromAccount: AccountLike,
  fromParentAccount?: Account,
  toAccount: AccountLike,
  toParentAccount?: Account,

  toExists: boolean,
  operation: Operation,
  provider: string,
  sellId: string,
  status: string,
  fromAmount: BigNumber,
  toAmount: BigNumber,
};

export type SellOperation = {
  provider: string,
  sellId: string,
  status: string,

  receiverAccountId: string,
  tokenId?: string,
  operationId: string,

  fromAmount: BigNumber,
  toAmount: BigNumber,
};

export type SellOperationRaw = {
  provider: string,
  sellId: string,
  status: string,

  receiverAccountId: string,
  tokenId?: string,
  operationId: string,

  fromAmount: string,
  toAmount: string,
};

export type SellState = {
  sell: {
    exchange: $Shape<Exchange>,
    exchangeRate?: ?ExchangeRate,
  },
  error?: ?Error,
  ratesTimestamp?: Date,
  okCurrencies: (CryptoCurrency | TokenCurrency)[],
  fromCurrency: ?(CryptoCurrency | TokenCurrency),
  toCurrency: ?(CryptoCurrency | TokenCurrency),
  useAllAmount: boolean,
  fromAmount: BigNumber,
};

export type InitSellInput = {
  parentAccount: ?Account,
  account: AccountLike,
  transaction: Transaction,
  deviceId: string,
};

export type InitSellInputRaw = {
  exchange: ExchangeRaw,
  exchangeRate: ExchangeRateRaw,
  transaction: TransactionRaw,
  deviceId: string,
};
