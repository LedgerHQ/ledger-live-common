import Fil from "@zondax/ledger-filecoin";
import type { Resolver } from "../../hw/getAddress/types";
import { getPath, isError } from "./utils";

const resolver: Resolver = async (transport, { path }) => {
  const fil = new Fil(transport);

  const r = await fil.getAddressAndPubKey(getPath(path));
  isError(r);

  return {
    path,
    address: r.addrString,
    publicKey: r.compressed_pk.toString("hex"),
  };
};

export default resolver;
