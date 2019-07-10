// @flow
import { reflect as bitcoinReflect } from "../families/bitcoin/types";
import type { CoreStatics as CoreStatics_bitcoin } from "../families/bitcoin/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_bitcoin } from "../families/bitcoin/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_bitcoin } from "../families/bitcoin/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_bitcoin } from "../families/bitcoin/types";
import type { Transaction as bitcoinTransaction } from "../families/bitcoin/types";
import type { TransactionRaw as bitcoinTransactionRaw } from "../families/bitcoin/types";
import { reflect as ethereumReflect } from "../families/ethereum/types";
import type { CoreStatics as CoreStatics_ethereum } from "../families/ethereum/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_ethereum } from "../families/ethereum/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_ethereum } from "../families/ethereum/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_ethereum } from "../families/ethereum/types";
import type { Transaction as ethereumTransaction } from "../families/ethereum/types";
import type { TransactionRaw as ethereumTransactionRaw } from "../families/ethereum/types";
import { reflect as rippleReflect } from "../families/ripple/types";
import type { CoreStatics as CoreStatics_ripple } from "../families/ripple/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_ripple } from "../families/ripple/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_ripple } from "../families/ripple/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_ripple } from "../families/ripple/types";
import type { Transaction as rippleTransaction } from "../families/ripple/types";
import type { TransactionRaw as rippleTransactionRaw } from "../families/ripple/types";

export type SpecificStatics = {}
& CoreStatics_bitcoin
& CoreStatics_ethereum
& CoreStatics_ripple
export type CoreAccountSpecifics = {}
& CoreAccountSpecifics_bitcoin
& CoreAccountSpecifics_ethereum
& CoreAccountSpecifics_ripple
export type CoreOperationSpecifics = {}
& CoreOperationSpecifics_bitcoin
& CoreOperationSpecifics_ethereum
& CoreOperationSpecifics_ripple
export type CoreCurrencySpecifics = {}
& CoreCurrencySpecifics_bitcoin
& CoreCurrencySpecifics_ethereum
& CoreCurrencySpecifics_ripple
export type Transaction =
  | bitcoinTransaction
  | ethereumTransaction
  | rippleTransaction
export type TransactionRaw =
  | bitcoinTransactionRaw
  | ethereumTransactionRaw
  | rippleTransactionRaw
export const reflectSpecifics = (declare: *) => {
bitcoinReflect(declare);
ethereumReflect(declare);
rippleReflect(declare);
};
