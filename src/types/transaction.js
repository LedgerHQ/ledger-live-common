// @flow

import type { BigNumber } from "bignumber.js";
import type { Operation, OperationRaw } from "./operation";
import type {
  BitcoinInput,
  BitcoinOutput,
  BitcoinInputRaw,
  BitcoinOutputRaw,
} from "../families/bitcoin/types";

export type SignedOperation = {|
  // prepared version of Operation before it's even broadcasted
  // .id/.hash is potentially not settled yet
  operation: Operation,
  // usually the device signature hex OR anything that is needed to broadcast (can be an inline JSON)
  signature: string,
  // sometimes a coin needs the raw object (it must be serializable)
  signatureRaw?: Object,
  // date calculated as expiring
  expirationDate: ?Date,
|};

export type SignedOperationRaw = {|
  operation: OperationRaw,
  signature: string,
  signatureRaw?: Object,
  expirationDate: ?string,
|};

export type SignOperationEvent =
  // Used when lot of exchange is needed with the device to visually express a progress
  // It can be used before and/or after the signature
  // only used if it can takes >1s to show a visual progress to user (typically UTXO streaming)
  | { type: "device-streaming", progress: number, index: number, total: number } // optional
  // REQUIRED Indicates that a signature is now appearing and awaited on the device to confirm
  | { type: "device-signature-requested" }
  // REQUIRED Indicates user have confirmed the transaction
  | { type: "device-signature-granted" }
  // REQUIRED payload of the resulting signed operation
  | { type: "signed", signedOperation: SignedOperation };

export type SignOperationEventRaw =
  | { type: "device-streaming", progress: number, index: number, total: number }
  | { type: "device-signature-requested" }
  | { type: "device-signature-granted" }
  | { type: "signed", signedOperation: SignedOperationRaw };

// Transaction is a generic object that holds all state for all transactions
// there are generic fields and coin specific fields. That's why almost all fields are optionals
export type TransactionCommon = {|
  amount: BigNumber,
  recipient: string,
  useAllAmount?: boolean,
  subAccountId?: ?string,
|};

export type TransactionCommonRaw = {|
  amount: string,
  recipient: string,
  useAllAmount?: boolean,
  subAccountId?: ?string,
|};

// TransactionStatus is a view of Transaction with general info to be used on the UI and status info.
export type TransactionStatus = {|
  // potential error for each (user) field of the transaction
  errors: { [string]: Error },
  // potential warning for each (user) field for a transaction
  warnings: { [string]: Error },
  // estimated total fees the tx is going to cost. (in the mainAccount currency)
  estimatedFees: BigNumber,
  // actual amount that the recipient will receive (in account currency)
  amount: BigNumber,
  // total amount that the sender will spend (in account currency)
  totalSpent: BigNumber,
  // should the recipient be non editable
  recipientIsReadOnly?: boolean,
  txInputs?: BitcoinInput[],
  txOutputs?: BitcoinOutput[],
|};

export type TransactionStatusRaw = {|
  errors: { [string]: string },
  warnings: { [string]: string },
  estimatedFees: string,
  amount: string,
  totalSpent: string,
  useAllAmount?: boolean,
  recipientIsReadOnly?: boolean,
  txInputs?: BitcoinInputRaw[],
  txOutputs?: BitcoinOutputRaw[],
|};
