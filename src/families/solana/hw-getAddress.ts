import type { Resolver } from "../../hw/getAddress/types";
import Solana from "@ledgerhq/hw-app-solana";

const resolver: Resolver = async (transport, { path, verify }) => {
    const solana = new Solana(transport);

    const r = await solana.getAddress(path, verify);

    return {
        address: r.address.toString("hex"),
        // TODO: fix pubkey
        publicKey: "dummy public key",
        path,
    };
};

export default resolver;
