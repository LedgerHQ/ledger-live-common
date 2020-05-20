// @flow

import { BigNumber } from "bignumber.js";
import type { Account, AccountLike } from "../types/account";
import type {
  AccountRawLike,
  AccountRaw,
  Operation,
  Transaction,
  Currency
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
  fromAccount: AccountRawLike,
  toParentAccount: ?AccountRaw,
  toAccount: AccountRawLike,
  fromAmount: string,
  sendMax: boolean
};

export type ExchangeRate = {
  rate: BigNumber, // NB Raw rate, for display
  magnitudeAwareRate: BigNumber, // NB rate between satoshi units
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

export type SwapStatusRequest = {
  provider: string,
  swapId: string
};

export type SwapStatus = {
  provider: string,
  swapId: string,
  status: ValidSwapStatus
};

export type GetStatus = SwapStatusRequest => Promise<SwapStatus>;
export type GetMultipleStatus = (SwapStatusRequest[]) => Promise<SwapStatus[]>;

/*
// TO BE FIGURED OUT
type FamilySwapSpecifics = {
   getSerializedAddressParams: ?? => ??,
   signatures: Buffer
}
*/

// bridge.signOperation
// bridge.broadcast => Operation

export type MappedSwapOperation = {
  fromAccount: AccountLike,
  fromParentAccount?: Account,
  toAccount: AccountLike,
  toParentAccount?: Account,

  operation: Operation,
  provider: string,
  swapId: string,
  status: string,
  fromAmount: BigNumber,
  toAmount: BigNumber
};

export type SwapOperation = {
  provider: string,
  swapId: string,
  status: string,

  receiverAccountId: string,
  receiverParentAccountId?: string,
  operationId: string,

  fromAmount: BigNumber,
  toAmount: BigNumber
};

export type SwapOperationRaw = {
  provider: string,
  swapId: string,
  status: string,

  receiverAccountId: string,
  receiverParentAccountId?: string,
  operationId: string,

  fromAmount: string,
  toAmount: string
};

export type SwapState = {
  swap: {
    exchange: $Shape<Exchange>,
    exchangeRate?: ?ExchangeRate
  },
  error?: ?Error,
  isLoading: boolean,
  okCurrencies: Currency[],
  fromCurrency: ?Currency,
  toCurrency: ?Currency
};
