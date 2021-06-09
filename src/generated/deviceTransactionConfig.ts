import bitcoin from "../families/bitcoin/deviceTransactionConfig.ts";
import ethereum from "../families/ethereum/deviceTransactionConfig.ts";
import tron from "../families/tron/deviceTransactionConfig.ts";

export default {
  bitcoin,
  ethereum,
  tron,
};
import { ExtraDeviceTransactionField as ExtraDeviceTransactionField_tron } from "../families/tron/deviceTransactionConfig";
export type ExtraDeviceTransactionField =
| ExtraDeviceTransactionField_tron
