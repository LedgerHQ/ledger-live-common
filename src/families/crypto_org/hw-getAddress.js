// @flow

import Cosmos from "@ledgerhq/hw-app-cosmos";
import type { Resolver } from "../../hw/getAddress/types";
import { getEnv } from "../../env";

const CRYPTO_ORG_USE_TESTNET = getEnv("CRYPTO_ORG_USE_TESTNET");

const resolver: Resolver = async (transport, { path, verify }) => {
  const cosmos = new Cosmos(transport);
  const cointype = CRYPTO_ORG_USE_TESTNET ? "tcro" : "cro";
  const r = await cosmos.getAddress(path, cointype, verify || false);

  return {
    address: r.address,
    publicKey: r.publicKey,
    path,
  };
};

export default resolver;
