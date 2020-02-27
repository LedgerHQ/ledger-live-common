// @flow

import { BigNumber } from "bignumber.js";
import type { Account, AccountLike } from "../types/account";
import type { DeviceId, Transaction } from "../types";

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
  providerURL: ?string,
  expirationDate: ?Date // FIXME not available? Asked channel where we get this from
};

// to be called every time Exchange changes
// it could fail if the exchange is not possible (out of range)
export type GetExchangeRate = Exchange => Promise<ExchangeRate>;

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

// META: this is what the UI "operation" will need
// type SwapOperation = {
//   exchange: Exchange,
//   exchangeStatus: ExchangeStatus, // TODO what is ExchangeStatus
//   operation: Operation,
//   swapId: string
// };

type SwapStatus =
  | "Confirming"
  | "Finished"
  | "Exchanging"
  | "Hold"
  | "Sending"
  | "Waiting"
  | "Overdue"
  | "Refunded"
  | "New"
  | "Expired"
  | "Failed";

export type GetSwapStatus = ({ swapId: string }) => Promise<SwapStatus>;
