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
  transactions: Operation[],
  context: any,
  penalty: number,
};

export type GlobalHeuristicReport = {
  score: number,
  level: "good" | "better" | "best",
  reports: HeuristicReport[],
};
