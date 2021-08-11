// @flow

import Lat from "@ledgerhq/hw-app-lat";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (
  transport,
  { path, verify, askChainCode }
) => {
  const lat = new Lat(transport);
  const r = await lat.getAddress(path, verify, askChainCode || false);
  return { path, address: r.address, publicKey: r.publicKey, chainCode: r.chainCode };
};

export default resolver;
