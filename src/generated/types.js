// @flow
import { reflect as arkReflect } from "../families/ark/types";
import type { CoreStatics as CoreStatics_ark } from "../families/ark/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_ark } from "../families/ark/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_ark } from "../families/ark/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_ark } from "../families/ark/types";
import { reflect as bitcoinReflect } from "../families/bitcoin/types";
import type { CoreStatics as CoreStatics_bitcoin } from "../families/bitcoin/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_bitcoin } from "../families/bitcoin/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_bitcoin } from "../families/bitcoin/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_bitcoin } from "../families/bitcoin/types";
import { reflect as ethereumReflect } from "../families/ethereum/types";
import type { CoreStatics as CoreStatics_ethereum } from "../families/ethereum/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_ethereum } from "../families/ethereum/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_ethereum } from "../families/ethereum/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_ethereum } from "../families/ethereum/types";
import { reflect as rippleReflect } from "../families/ripple/types";
import type { CoreStatics as CoreStatics_ripple } from "../families/ripple/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_ripple } from "../families/ripple/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_ripple } from "../families/ripple/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_ripple } from "../families/ripple/types";

export type SpecificStatics = {}
& CoreStatics_ark
& CoreStatics_bitcoin
& CoreStatics_ethereum
& CoreStatics_ripple
export type CoreAccountSpecifics = {}
& CoreAccountSpecifics_ark
& CoreAccountSpecifics_bitcoin
& CoreAccountSpecifics_ethereum
& CoreAccountSpecifics_ripple
export type CoreOperationSpecifics = {}
& CoreOperationSpecifics_ark
& CoreOperationSpecifics_bitcoin
& CoreOperationSpecifics_ethereum
& CoreOperationSpecifics_ripple
export type CoreCurrencySpecifics = {}
& CoreCurrencySpecifics_ark
& CoreCurrencySpecifics_bitcoin
& CoreCurrencySpecifics_ethereum
& CoreCurrencySpecifics_ripple
export const reflectSpecifics = (declare: *) => {
arkReflect(declare);
bitcoinReflect(declare);
ethereumReflect(declare);
rippleReflect(declare);
};
