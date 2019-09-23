// @flow

import type { BigNumber } from "bignumber.js";
import type { Operation, OperationRaw } from "./operation";

export type SignAndBroadcastEvent =
  | { type: "signing" }
  | { type: "signed" }
  | { type: "broadcasted", operation: Operation };

export type SignAndBroadcastEventRaw =
  | { type: "signing" }
  | { type: "signed" }
  | { type: "broadcasted", operation: OperationRaw };

// Transaction is a generic object that holds all state for all transactions
// there are generic fields and coin specific fields. That's why almost all fields are optionals
export type TransactionCommon = {|
  amount: BigNumber,
  recipient: string,
  useAllAmount?: boolean,
  subAccountId?: ?string // FIXME move to etherum family
|};

export type TransactionCommonRaw = {|
  amount: string,
  recipient: string,
  useAllAmount?: boolean,
  subAccountId?: ?string
|};

// TransactionStatus is a view of Transaction with general info to be used on the UI and status info.
export type TransactionStatus = {|
  // summarize if the transaction is good to go or have validation error
  transactionError: ?Error,
  // null if recipient is valid, otherwise it will be an error, likely InvalidAddress error
  recipientError: ?Error,
  // null if recipient have no warning. recipient can be valid but have warning to display (e.g. ETH EIP55)
  recipientWarning: ?Error,
  // ? should UI show a warning about fees being high (currently have been hardcoded to be if fee>10% of amount)
  showFeeWarning: boolean,
  // estimated total fees the tx is going to cost. (in the mainAccount currency)
  estimatedFees: BigNumber,
  // actual amount that the recipient will receive (in account currency)
  amount: BigNumber,
  // total amount that the sender will spend (in account currency)
  totalSpent: BigNumber,
  // ? will it wipe all possible amount of the account
  useAllAmount: boolean,
  // should the recipient be non editable
  recipientIsReadOnly?: boolean
|};

export type TransactionStatusRaw = {|
  transactionError: ?string,
  recipientError: ?string,
  recipientWarning: ?string,
  showFeeWarning: boolean,
  estimatedFees: string,
  amount: string,
  totalSpent: string,
  useAllAmount: boolean,
  recipientIsReadOnly?: boolean
|};
