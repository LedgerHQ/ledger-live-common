import bitcoin from "../families/bitcoin/deviceTransactionConfig";

import cosmos from "../families/cosmos/deviceTransactionConfig";

import ethereum from "../families/ethereum/deviceTransactionConfig";

import tezos from "../families/tezos/deviceTransactionConfig";

import tron from "../families/tron/deviceTransactionConfig";


export default {
  bitcoin,
  cosmos,
  ethereum,
  tezos,
  tron,
};
import { ExtraDeviceTransactionField as ExtraDeviceTransactionField_cosmos } from "../families/cosmos/deviceTransactionConfig";
import { ExtraDeviceTransactionField as ExtraDeviceTransactionField_tezos } from "../families/tezos/deviceTransactionConfig";
import { ExtraDeviceTransactionField as ExtraDeviceTransactionField_tron } from "../families/tron/deviceTransactionConfig";
export type ExtraDeviceTransactionField =
| ExtraDeviceTransactionField_cosmos
| ExtraDeviceTransactionField_tezos
| ExtraDeviceTransactionField_tron
