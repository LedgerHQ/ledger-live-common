import { NetworkId } from "./types";
import { types as TyphonTypes } from "@stricahq/typhonjs";

import testnetCostModels from "./costmodels/testnet-protocol.json";

type ENV_TYPE = {
  NETWORK: number;
  ADDRESS_PREFIX: string;
  PROTO_PARAM: {
    feesA: string;
    feesB: string;
    lovelacePerUtxoWord: string;
    poolDeposit: string;
    keyDeposit: string;
    maxTokenValue: string;
    networkMagic: number;
    priceSteps: string;
    priceMemory: string;
    collateralPercent: string;
  };
  costModel: TyphonTypes.LanguageView;
};

const testnetEnv: ENV_TYPE = {
  NETWORK: NetworkId.testnet,
  ADDRESS_PREFIX: "addr_test",
  PROTO_PARAM: {
    feesA: "44",
    feesB: "155381",
    lovelacePerUtxoWord: "34482",
    poolDeposit: "500000000",
    keyDeposit: "2000000",
    maxTokenValue: "9223372036854775807",
    networkMagic: 1097911063,
    priceSteps: "0.0000721",
    priceMemory: "0.0577",
    collateralPercent: "150",
  },
  costModel: testnetCostModels,
};

//TODO:CARDANO add mainnetEnv

export const CARDANO_ENV = testnetEnv;
