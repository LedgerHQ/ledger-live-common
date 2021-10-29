import type { Resolver } from "../../hw/getAddress/types";
import Solana from "@ledgerhq/hw-app-solana";

import bs58 from "bs58";

const resolver: Resolver = async (transport, { path, verify }) => {
  //const solana = new Solana(transport);

  //const { address } = await solana.getAddress(path, verify);

  //const publicKey = bs58.encode(address);
  //
  //
  console.log("path is ", path);

  const publicKey =
    path === "44'/501'/0'/0'"
      ? "mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN"
      : "9e9g3ToKfNQF6yQewroZZr6g5Xm96dZFwsDH5yrSoHuW";

  return {
    address: publicKey,
    publicKey,
    path,
  };
};

export default resolver;
