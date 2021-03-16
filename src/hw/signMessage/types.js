// @flow
import type Transport from "@ledgerhq/hw-transport";
import type { CryptoCurrency } from "../../types";
import type { DerivationMode } from "../../derivation";

export type Result = {
  rsv: {
    r: string,
    s: string,
    v: number,
  },
  signature: string,
};

export type MessageData = {
  currency: CryptoCurrency,
  path: string,
  verify?: boolean,
  derivationMode: DerivationMode,
  message: string,
};

export type Resolver = (Transport<*>, MessageData) => Promise<Result>;
