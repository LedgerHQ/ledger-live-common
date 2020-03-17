// @flow

import { BigNumber } from "bignumber.js";
import type { Account, AccountLike } from "../types/account";
import type {
  AccountRawLike,
  AccountRaw,
  Operation,
  Transaction, SubAccountRaw
} from "../types";

// in bridge? heuristic. error could happen later.
export type EstimateMaxSpendable = (account: Account) => BigNumber;

// description of the initial form
export type Exchange = {
  fromParentAccount: ?Account,
  fromAccount: AccountLike,
  toParentAccount: ?Account,
  toAccount: AccountLike,
  fromAmount: BigNumber,
  sendMax: boolean
};

export type ExchangeRaw = {
  fromParentAccount: ?AccountRaw,
  fromAccount: AccountRaw | SubAccountRaw,
  toParentAccount: ?AccountRaw,
  toAccount: AccountRawLike,
  fromAmount: string,
  sendMax: boolean
};

export type ExchangeRate = {
  rate: BigNumber,
  rateId: string,
  provider: string,
  providerURL?: ?string,
  expirationDate?: ?Date // FIXME not available? Asked channel where we get this from
};

export type AvailableProvider = {
  provider: string,
  supportedCurrencies: string[]
};

export type GetExchangeRates = Exchange => Promise<ExchangeRate[]>;
export type GetProviders = () => Promise<AvailableProvider[]>;

export type InitSwapResult = {
  transaction: Transaction,
  swapId: string
};

// init a swap with the Exchange app
// throw if TransactionStatus have errors
// you get at the end a final Transaction to be done (it's not yet signed, nor broadcasted!) and a swapId
export type InitSwap = (
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  deviceId: string
) => Promise<InitSwapResult>;

export type SwapCurrencyNameAndSignature = {
  config: Buffer,
  signature: Buffer
};

export type SwapProviderNameAndSignature = {
  nameAndPubkey: Buffer,
  signature: Buffer
};

type ValidSwapStatus =
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

type SwapStatus = {
  provider: string,
  swapId: string,
  status: ValidSwapStatus
};

export type GetStatus = (
  provider: string,
  swapId: string
) => Promise<SwapStatus[]>;

/*
// TO BE FIGURED OUT
type FamilySwapSpecifics = {
   getSerializedAddressParams: ?? => ??,
   signatures: Buffer
}
*/

// bridge.signOperation
// bridge.broadcast => Operation

export type SwapOperation = {
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  swapStatus: SwapStatus,
  operation: Operation
};
