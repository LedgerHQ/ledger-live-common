// @flow

import type { Heuristic } from "../types";
import { roundValue } from "./roundValue";
import { receiveAddressReuse } from "./receiveAddressReuse";
import { sendAddressReuse } from "./sendAddressReuse";
import { outputValue1000x } from "./outputValue1000x";
import { simpleCoinjoin } from "./simpleCoinjoin";
import { samouraiWhirlpool } from "./samouraiWhirlpool";

export const heuristics: Heuristic[] = [
  {
    id: "round-value",
    handler: roundValue,
    penaltyFactor: 0,
  },
  {
    id: "receive-address-reuse",
    handler: receiveAddressReuse,
    penaltyFactor: 0,
  },
  {
    id: "send-address-reuse",
    handler: sendAddressReuse,
    penaltyFactor: 0,
  },
  {
    id: "output-value-1000x",
    handler: outputValue1000x,
    penaltyFactor: 0,
  },
  {
    id: "simple-coinjoin",
    handler: simpleCoinjoin,
    penaltyFactor: 0,
  },
  {
    id: "samourai-whirlpool",
    handler: samouraiWhirlpool,
    penaltyFactor: 0,
  },
];
