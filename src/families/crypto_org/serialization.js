// @flow
import { BigNumber } from "bignumber.js";
import type { CryptoOrgResourcesRaw, CryptoOrgResources } from "./types";

export function toCryptoOrgResourcesRaw(
  r: CryptoOrgResources
): CryptoOrgResourcesRaw {
  const { nonce, additionalBalance } = r;
  return {
    nonce,
    additionalBalance: additionalBalance.toString(),
  };
}

export function fromCryptoOrgResourcesRaw(
  r: CryptoOrgResourcesRaw
): CryptoOrgResources {
  const { nonce, additionalBalance } = r;
  return {
    nonce,
    additionalBalance: BigNumber(additionalBalance),
  };
}