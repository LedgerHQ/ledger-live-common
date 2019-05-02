// @flow

import invariant from "invariant";
import type Transport from "@ledgerhq/hw-transport";
import type { CryptoCurrency } from "../../types";
import bitcoin from "./btc";
import ethereum from "./ethereum";
import ripple from "./ripple";

type Resolver = (
  transport: Transport<*>,
  currency: CryptoCurrency
) => Promise<{
  version?: string
}>;

const perFamily: { [_: string]: * } = {
  bitcoin,
  ethereum,
  ripple
};

console.warn(
  "Usage of debugAppInfosForCurrency is deprecated. Prefer getAppAndVersion"
);

const proxy: Resolver = (transport, currency) => {
  const getAddress = perFamily[currency.family];
  invariant(getAddress, `getAddress not implemented for ${currency.id}`);
  return getAddress(transport);
};

export default proxy;
