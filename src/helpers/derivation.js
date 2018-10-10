// @flow
import type { CryptoCurrency } from "../types";
import { getCryptoCurrencyById } from "./currencies";

export const getMandatoryEmptyAccountSkip = (derivationMode: string): number =>
  derivationMode === "ethM" || derivationMode === "etcM" ? 10 : 0;

/**
 * return a ledger-lib-core compatible DerivationScheme format
 * for a given currency and derivationMode (you can pass an Account because same shape)
 */
export const getDerivationScheme = ({
  derivationMode,
  currency
}: {
  derivationMode: string,
  currency: CryptoCurrency
}): string => {
  const splitFrom =
    derivationMode.indexOf("_unsplit") !== -1 ? currency.forkedFrom : undefined;
  const coinType = splitFrom
    ? getCryptoCurrencyById(splitFrom).coinType
    : "<coin_type>";
  const purpose = derivationMode === "segwit" ? "49" : "44";
  if (derivationMode === "ethM") {
    // old MEW derivation scheme
    return "44'/60'/0'/<account>";
  }
  if (derivationMode === "etcM") {
    // old MEW derivation scheme for ETC
    return "44'/60'/160720'/0'/<account>";
  }
  if (derivationMode === "rip") {
    // XRP legacy that the old Chrome Ripple Wallet used to wrongly derivate addresses on.
    return "44'/144'/0'/<account>'";
  }
  return `${purpose}'/${coinType}'/<account>'/<node>/<address>`;
};

// Execute a derivation scheme in JS side
export const runDerivationScheme = (
  derivationScheme: string,
  params: {
    coin_type?: number,
    account?: number,
    node?: number,
    address?: number
  } = {}
) =>
  derivationScheme
    .replace("<coin_type>", String(params.coin_type || 0))
    .replace("<account>", String(params.account || 0))
    .replace("<node>", String(params.node || 0))
    .replace("<address>", String(params.address || 0));

const legacyDerivations = {
  ethereum: ["ethM"],
  ethereum_classic: ["ethM", "etcM"],
  ripple: ["rip"]
};

// return an array of ways to derivate, by convention the latest is the standard one.
export const getDerivationModesForCurrency = (
  currency: CryptoCurrency
): string[] => {
  const all = legacyDerivations[currency.id].slice(0) || [];
  if (currency.forkedFrom) {
    all.push("unsplit");
    if (currency.supportsSegwit) {
      all.push("segwit");
    }
  }
  all.push("");
  if (currency.supportsSegwit) {
    all.push("segwit");
  }
  return all;
};
