import type { Resolver } from "../../hw/getAddress/types";
import Solana from "@ledgerhq/hw-app-solana";

import bs58 from "bs58";

const resolver: Resolver = async (transport, { path, verify }) => {
    const solana = new Solana(transport);

    const { address } = await solana.getAddress(path, verify);

    return {
        address: bs58.encode(address),
        // TODO: fix pubkey
        publicKey: "dummy public key",
        path,
    };
};

export default resolver;
