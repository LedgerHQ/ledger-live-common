import Fil from "@zondax/ledger-filecoin";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path }) => {
  const fil = new Fil(transport);

  const customePath = path && path.substr(0, 2) !== "m/" ? `m/${path}` : path;
  const r = await fil.getAddressAndPubKey(customePath);

  if (r.return_code != 36864)
    throw new Error(`${r.return_code} - ${r.error_message}`);

  return {
    path,
    address: r.addrString,
    publicKey: r.compressed_pk.toString("hex"),
  };
};

export default resolver;
