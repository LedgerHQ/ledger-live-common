/**
 * @module mock/account
 * @flow
 */
import Prando from "prando";

import type { CryptoCurrency, TokenCurrency } from "../types";

/**
 * @memberof mock/account
 */
export function genBitcoinAddressLike(rng: Prando) {
  const charset = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return `1${rng.nextString(rng.nextInt(25, 34), charset)}`;
}

/**
 * @memberof mock/account
 */
export function genHex(length: number, rng: Prando) {
  return rng.nextString(length, "0123456789ABCDEF");
}

/**
 * @memberof mock/account
 */
export function genAddress(
  currency: CryptoCurrency | TokenCurrency,
  rng: Prando
) {
  if (
    currency.type === "CryptoCurrency"
      ? currency.family === "ethereum" // all eth family
      : currency.id.startsWith("ethereum") // erc20 case
  ) {
    return `0x${genHex(40, rng)}`;
  }
  return genBitcoinAddressLike(rng);
}
