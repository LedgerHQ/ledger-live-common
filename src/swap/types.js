// @flow

import BigNumber from "bignumber.js";
import { AccountLike } from "../types/account";

// in bridge? heuristic. error could happen later.
export type EstimateMaxSpendable = (account: Account) => BigNumber;

// description of the initial form
export type Exchange = {
  // FIXME what types to use exactly? check getMainAccount()
  fromParentAccount: ?Account,
  fromAccount: AccountLike,

  toParentAccount: ?Account,
  toAccount: AccountLike,

  fromAmount: BigNumber,
  sendMax: boolean
};

export type ExchangeRate = {
  // FIXME is this rate fixed?
  rate: BigNumber,
  rateId: string,
  provider: string,
  providerURL: string, // FIXME not available?
  expirationDate: ?Date // FIXME not available?
};

// to be called every time Exchange changes
// it could fail if the exchange is not possible (out of range)
export type GetExchangeRate = Exchange => Promise<ExchangeRate>;

// FIXME: does the swap provider expect us to use the EXACT amount? can we have some approx?

// init a swap with the Exchange app
// throw if TransactionStatus have errors
// you get at the end a final Transaction to be done (it's not yet signed, nor broadcasted!) and a swapId
export type InitSwap = ({
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  deviceId: DeviceId
}) => Promise<{
  transaction: Transaction,
  swapId: string
}>;
/*
// TO BE FIGURED OUT
type FamilySwapSpecifics = {
   getSerializedAddressParams: ?? => ??,
   signatures: Buffer
}
*/

// bridge.signOperation
// bridge.broadcast => Operation

/*
// META: this is what the UI "operation" will need
type SwapOperation = {
  exchange: Exchange,
  exchangeStatus: ExchangeStatus,
  operation: Operation,
  swapId: string
};
*/

type SwapStatus = string;

export type GetSwapStatus = ({ swapId: string }) => Promise<SwapStatus>;
