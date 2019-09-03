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
import * as RippleJSBridge from "../families/ripple/RippleJSBridge";
import * as EthereumJSBridge from "../families/ethereum/EthereumJSBridge";
import LibcoreCurrencyBridge from "./LibcoreCurrencyBridge";
import LibcoreBitcoinAccountBridge from "../families/bitcoin/LibcoreBitcoinAccountBridge";
import LibcoreEthereumAccountBridge from "../families/ethereum/LibcoreEthereumAccountBridge";
import {
  makeMockCurrencyBridge,
  makeMockAccountBridge
} from "./makeMockBridge";
import { checkAccountSupported, libcoreNoGo } from "../account/support";
import LibcoreRippleAccountBridge from "../families/ripple/LibcoreRippleAccountBridge";

const mockCurrencyBridge = makeMockCurrencyBridge();
const mockAccountBridge = makeMockAccountBridge();

const currencyBridgeJSImplFallback = {
  ripple: RippleJSBridge.currencyBridge,
  ethereum: EthereumJSBridge.currencyBridge
};

export const getCurrencyBridge = (currency: CryptoCurrency): CurrencyBridge => {
  const forceImpl = getEnv("BRIDGE_FORCE_IMPLEMENTATION");
  if (getEnv("MOCK") || forceImpl === "mock") return mockCurrencyBridge;
  if (forceImpl === "js" || (!forceImpl && libcoreNoGo.includes(currency.id))) {
    const jsImpl = currencyBridgeJSImplFallback[currency.family];
    if (jsImpl) return jsImpl;
    throw new CurrencyNotSupported(
      "no implementation available for currency " + currency.id,
      {
        currencyName: currency.name
      }
    );
  }
  return LibcoreCurrencyBridge;
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
  if (type === "libcore") {
    if (mainAccount.currency.family === "ethereum") {
      return LibcoreEthereumAccountBridge;
    }
    if (mainAccount.currency.family === "ripple") {
      return LibcoreRippleAccountBridge;
    }
    if (mainAccount.currency.family === "bitcoin") {
      return LibcoreBitcoinAccountBridge;
    }
  }
  switch (mainAccount.currency.family) {
    case "ripple":
      return RippleJSBridge.accountBridge;
    case "ethereum":
      return EthereumJSBridge.accountBridge;
    default:
      throw new CurrencyNotSupported("currency not supported", {
        currencyName: mainAccount.currency.name
      });
  }
};
