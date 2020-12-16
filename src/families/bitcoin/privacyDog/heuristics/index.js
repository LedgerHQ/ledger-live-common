// @flow

import type { Heuristic } from "../types";
import { roundValue } from "./roundValue";
import { receiveAddressReuse } from "./receiveAddressReuse";

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
];
