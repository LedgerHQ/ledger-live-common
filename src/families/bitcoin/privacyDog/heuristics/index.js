// @flow

import type { Heuristic } from "../types";
import { roundValue } from "./roundValue";
import { receiveAddressReuse } from "./receiveAddressReuse";
import { outputValue1000x } from "./outputValue1000x";

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
    id: "output-value-1000x",
    handler: outputValue1000x,
    penaltyFactor: 0,
  },
];
