// @flow
import { CurrencyNotSupported } from "@ledgerhq/errors";
import type {
  CryptoCurrency,
  Account,
  TokenAccount,
  CurrencyBridge,
  AccountBridge
} from "../types";
import { decodeAccountId, getMainAccount } from "../account";
import { getEnv } from "../env";
import * as RippleJSBridge from "../families/ripple/bridge/js";
import * as EthereumJSBridge from "../families/ethereum/bridge/js";
import * as LibcoreBitcoinBridge from "../families/bitcoin/bridge/libcore";
import * as LibcoreTezosBridge from "../families/tezos/bridge/libcore";
import * as LibcoreEthereumBridge from "../families/ethereum/bridge/libcore";
import * as LibcoreRippleBridge from "../families/ripple/bridge/libcore";
import {
  makeMockCurrencyBridge,
  makeMockAccountBridge
} from "./makeMockBridge";
import { checkAccountSupported, libcoreNoGo } from "../account/support";

const mockCurrencyBridge = makeMockCurrencyBridge();
const mockAccountBridge = makeMockAccountBridge();

const jsBridges = {
  ripple: RippleJSBridge,
  ethereum: EthereumJSBridge
};

const libcoreBridges = {
  ethereum: LibcoreEthereumBridge,
  ripple: LibcoreRippleBridge,
  bitcoin: LibcoreBitcoinBridge,
  tezos: LibcoreTezosBridge
};

export const getCurrencyBridge = (currency: CryptoCurrency): CurrencyBridge => {
  const forceImpl = getEnv("BRIDGE_FORCE_IMPLEMENTATION");
  if (getEnv("MOCK") || forceImpl === "mock") return mockCurrencyBridge;
  if (forceImpl === "js" || (!forceImpl && libcoreNoGo.includes(currency.id))) {
    const jsBridge = jsBridges[currency.family];
    if (jsBridge) return jsBridge.currencyBridge;
  } else {
    const bridge = libcoreBridges[currency.family];
    if (bridge) {
      return bridge.currencyBridge;
    }
  }
  throw new CurrencyNotSupported(
    "no implementation available for currency " + currency.id,
    {
      currencyName: currency.name
    }
  );
};

export const getAccountBridge = (
  account: Account | TokenAccount,
  parentAccount: ?Account
): AccountBridge<any> => {
  const mainAccount = getMainAccount(account, parentAccount);
  const { type } = decodeAccountId(mainAccount.id);
  const supportedError = checkAccountSupported(mainAccount);
  if (supportedError) {
    throw supportedError;
  }
  if (type === "mock") return mockAccountBridge;
  const { family } = mainAccount.currency;
  if (type === "libcore") {
    const libcoreBridge = libcoreBridges[family];
    if (libcoreBridge) return libcoreBridge.accountBridge;
  }
  const jsBridge = libcoreBridges[family];
  if (jsBridge) {
    return jsBridge.accountBridge;
  }
  throw new CurrencyNotSupported("currency not supported", {
    currencyName: mainAccount.currency.name
  });
};
