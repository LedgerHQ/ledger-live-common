// @flow

import type Transport from "@ledgerhq/hw-transport";
import { BigNumber } from "bignumber.js";
import type { Account, AccountLike } from "../types/account";
import type { Transaction } from "../types";

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

export type ExchangeRate = {
  rate: BigNumber,
  rateId: string,
  provider: string,
  providerURL?: ?string,
  expirationDate?: ?Date // FIXME not available? Asked channel where we get this from
};

// to be called every time Exchange changes
// it could fail if the exchange is not possible (out of range)
export type GetExchangeRates = Exchange => Promise<ExchangeRate[]>;

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

export type GetSwapStatus = (
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

// META: this is what the UI "operation" will need
// type SwapOperation = {
//   exchange: Exchange,
//   exchangeStatus: ExchangeStatus, // TODO what is ExchangeStatus
//   operation: Operation,
//   swapId: string
// };
