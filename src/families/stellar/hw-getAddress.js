// @flow

import Stellar from "@ledgerhq/hw-app-str";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path, verify }) => {
  const stellar = new Stellar(transport);

  // Alter the path since it deviates from the standard
  // NB stellar doesn't want non-hardened paths
  const matches = path.match(/\d+/g);
  const x = (matches && matches[2]) || "0";
  path = `44'/148'/${x}'`;

  const r = await stellar.getPublicKey(path, true, verify);
  return {
    path,
    publicKey: r.publicKey,
    address: r.publicKey // FIXME what's the diff?
  };
};

export default resolver;
