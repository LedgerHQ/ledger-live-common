// @flow

import Ark from "@arkecosystem/ledger-transport";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (
  transport,
  { path, verify }
) => {
  const ark = new Ark(transport);
  const { address, publicKey } = await ark.getAddress(
    path,
    verify
  );
  return { path, address, publicKey };
};

export default resolver;
