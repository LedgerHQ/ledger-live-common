// @flow

import type { Operation } from "../../../types";

export type HeuristicHandler = (account: Account) => HeuristicReport;

export type Heuristic = {
  id: string,
  penaltyFactor: number,
  handler: HeuristicHandler,
};

export type HeuristicReport = {
  heuristicId: string,
  operations: Operation[],
  context?: string,
  penalty: number,
};

export type GlobalHeuristicReport = {
  score: number,
  level: "good" | "better" | "best",
  reports: HeuristicReport[],
};
