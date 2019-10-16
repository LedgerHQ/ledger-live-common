// @flow

import Stellar from "@ledgerhq/hw-app-str";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path, verify }) => {
  const stellar = new Stellar(transport);

  const r = await stellar.getPublicKey(path, true, verify);
  return {
    path,
    publicKey: r.publicKey,
    address: r.publicKey // FIXME what's the diff?
  };
};

export default resolver;
