// @flow
import { AccountNotSupported, CurrencyNotSupported } from "@ledgerhq/errors";
import type { CryptoCurrency, Account, TokenAccount } from "../types";
import type { CurrencyBridge, AccountBridge } from "./types";
import { decodeAccountId, getMainAccount } from "../account";
import { getEnv } from "../env";
import * as RippleJSBridge from "./RippleJSBridge";
import * as EthereumJSBridge from "./EthereumJSBridge";
import LibcoreCurrencyBridge from "./LibcoreCurrencyBridge";
import LibcoreBitcoinAccountBridge from "./LibcoreBitcoinAccountBridge";
import LibcoreEthereumAccountBridge from "./LibcoreEthereumAccountBridge";
import {
  makeMockCurrencyBridge,
  makeMockAccountBridge
} from "./makeMockBridge";
import { getAllDerivationModes } from "../derivation";

const mockCurrencyBridge = makeMockCurrencyBridge();
const mockAccountBridge = makeMockAccountBridge();

export const getCurrencyBridge = (currency: CryptoCurrency): CurrencyBridge => {
  if (getEnv("MOCK")) return mockCurrencyBridge;
  switch (currency.family) {
    case "ripple":
      return RippleJSBridge.currencyBridge;
    case "ethereum":
      // ethereum classic not yet stable
      if (!getEnv("EXPERIMENTAL_LIBCORE")) {
        return EthereumJSBridge.currencyBridge;
      }
      return LibcoreCurrencyBridge;
    case "bitcoin":
      return LibcoreCurrencyBridge;
    default:
      return mockCurrencyBridge; // fallback mock until we implement it all!
  }
};

export const getAccountBridge = (
  account: Account | TokenAccount,
  parentAccount: ?Account
): AccountBridge<any> => {
  const mainAccount = getMainAccount(account, parentAccount);
  const { type } = decodeAccountId(mainAccount.id);
  if (!getAllDerivationModes().includes(mainAccount.derivationMode)) {
    throw new AccountNotSupported({ reason: mainAccount.derivationMode });
  }
  if (type === "mock") return mockAccountBridge;
  if (type === "libcore") {
    if (mainAccount.currency.family === "ethereum") {
      return LibcoreEthereumAccountBridge;
    }
    return LibcoreBitcoinAccountBridge;
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
