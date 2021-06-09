import bitcoin from "../families/bitcoin/deviceTransactionConfig.ts";
import ethereum from "../families/ethereum/deviceTransactionConfig.ts";
import tezos from "../families/tezos/deviceTransactionConfig.ts";
import tron from "../families/tron/deviceTransactionConfig.ts";

export default {
  bitcoin,
  ethereum,
  tezos,
  tron,
};
import { ExtraDeviceTransactionField as ExtraDeviceTransactionField_tezos } from "../families/tezos/deviceTransactionConfig";
import { ExtraDeviceTransactionField as ExtraDeviceTransactionField_tron } from "../families/tron/deviceTransactionConfig";
export type ExtraDeviceTransactionField =
| ExtraDeviceTransactionField_tezos
| ExtraDeviceTransactionField_tron
