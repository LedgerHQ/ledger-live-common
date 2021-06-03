// @flow

import Cosmos from "@ledgerhq/hw-app-cosmos";
import type { Resolver } from "../../hw/getAddress/types";
import { TESTNET_CURRENCY_ID } from "./logic";

const resolver: Resolver = async (transport, { path, verify, currency }) => {
  const cosmos = new Cosmos(transport);
  const useTestNet = currency.id == TESTNET_CURRENCY_ID ? true : false;
  const cointype = useTestNet ? "tcro" : "cro";
  const r = await cosmos.getAddress(path, cointype, verify || false);
  return {
    address: r.address,
    publicKey: r.publicKey,
    path,
  };
};

export default resolver;