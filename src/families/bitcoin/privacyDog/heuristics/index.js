// @flow

import type { Heuristic } from "../types";
import { roundValue } from "./roundValue";
import { receiveAddressReuse } from "./receiveAddressReuse";
import { sendAddressReuse } from "./sendAddressReuse";
import { outputValue1000x } from "./outputValue1000x";
import { simpleCoinjoin } from "./simpleCoinjoin";
import { samouraiWhirlpool } from "./samouraiWhirlpool";
import { scriptTypes } from "./scriptTypes";

export const heuristics: Heuristic[] = [
  {
    id: "round-value",
    handler: roundValue,
    penaltyFactor: 1,
  },
  {
    id: "receive-address-reuse",
    handler: receiveAddressReuse,
    penaltyFactor: 4,
  },
  {
    id: "send-address-reuse",
    handler: sendAddressReuse,
    penaltyFactor: 4,
  },
  {
    id: "output-value-1000x",
    handler: outputValue1000x,
    penaltyFactor: 1,
  },
  {
    id: "simple-coinjoin",
    handler: simpleCoinjoin,
    penaltyFactor: 1,
  },
  {
    id: "samourai-whirlpool",
    handler: samouraiWhirlpool,
    penaltyFactor: 1,
  },
  {
    id: "script-types",
    handler: scriptTypes,
    penaltyFactor: 0,
  },
];
