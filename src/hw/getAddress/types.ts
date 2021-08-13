import Transport from "@ledgerhq/hw-transport";
import type { CryptoCurrency } from "../../types";
import type { DerivationMode } from "../../derivation";
export type Result = {
  address: string;
  path: string;
  publicKey: string;
  chainCode?: string;
};
export type GetAddressOptions = {
  currency: CryptoCurrency;
  path: string;
  derivationMode: DerivationMode;
  verify?: boolean;
  skipAppFailSafeCheck?: boolean;
  askChainCode?: boolean;
  forceFormat?: string;
};
export type Resolver = (
  arg0: Transport,
  arg1: {
    currency: CryptoCurrency;
    path: string;
    derivationMode: DerivationMode;
    verify?: boolean;
    skipAppFailSafeCheck?: boolean;
    askChainCode?: boolean;
    forceFormat?: string;
    devicePath?: string;
    segwit?: boolean;
  }
) => Promise<Result>;
