import Fil from "@zondax/ledger-filecoin";
import type { Resolver, Result } from "../../hw/signMessage/types";
import { getBufferFromString, getPath, isError } from "./utils";

const resolver: Resolver = async (
  transport,
  { path, message }
): Promise<Result> => {
  const fil = new Fil(transport);

  if (!message) throw new Error(`Message cannot be empty`);

  const r = await fil.sign(getPath(path), getBufferFromString(message));
  isError(r);

  return {
    rsv: {
      r: r.signature_compact.slice(0, 32).toString("hex"),
      s: r.signature_compact.slice(32, 64).toString("hex"),
      v: parseInt(r.signature_compact.slice(64, 65).toString("hex"), 16),
    },
    signature: `0x${r.signature_compact.toString("hex")}`,
  };
};

export default resolver;