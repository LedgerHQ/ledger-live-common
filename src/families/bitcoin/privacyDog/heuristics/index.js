// @flow

import type { Heuristic } from "../types";
import { roundValue } from "./roundValue";

export const heuristics: Heuristic[] = [
  {
    id: "round-value",
    handler: roundValue,
    penaltyFactor: 0,
  },
];
