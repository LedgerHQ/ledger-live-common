import Eth from "@ledgerhq/hw-app-eth";
import { Resolver } from "./types";

const m: Resolver = async (transport, data) => {
  const eth = new Eth(transport);
  const result = await eth.signPersonalMessage(
    data.path,
    Buffer.from(data.message).toString("hex")
  );

  let v: string | number = result["v"] - 27;
  v = v.toString(16);

  if (v.length < 2) {
    v = "0" + v;
  }

  const signature = `0x${result["r"]}${result["s"]}${v}`;

  return {
    rsv: result,
    signature,
  };
};

export default m;
