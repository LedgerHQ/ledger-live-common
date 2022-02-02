import type { Resolver } from "../../hw/getAddress/types";
import Ada, {
  Networks,
  AddressType,
} from "@cardano-foundation/ledgerjs-hw-app-cardano";
import { str_to_path } from "@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils";
import { getBipPathFromString, getBipPathString } from "./helpers";
import { StakeChain } from "./types";
import { CARDANO_NETWORK_ID, STAKING_ADDRESS_INDEX } from "./constants";
import { utils as TyphonUtils } from "@stricahq/typhonjs";

const resolver: Resolver = async (transport, { path }) => {
  const spendingPath = getBipPathFromString(path);
  const stakingPathString = getBipPathString({
    account: spendingPath.account,
    chain: StakeChain.stake,
    index: STAKING_ADDRESS_INDEX,
  });
  const ada = new Ada(transport);
  const r = await ada.deriveAddress({
    network:
      CARDANO_NETWORK_ID === Networks.Mainnet.networkId
        ? Networks.Mainnet
        : Networks.Testnet,
    address: {
      type: AddressType.BASE_PAYMENT_KEY_STAKE_KEY,
      params: {
        spendingPath: str_to_path(path),
        stakingPath: str_to_path(stakingPathString),
      },
    },
  });
  return {
    address: TyphonUtils.getAddressFromHex(r.addressHex).getBech32(),
    publicKey: "",
    path,
  };
};

export default resolver;
