// @flow

import type { Account } from "../../../types";
import { heuristics } from "./heuristics";
import type { GlobalHeuristicReport } from "./types";

export function generateSecurityAudit(account: Account) {
  const globalReport: GlobalHeuristicReport = heuristics.reduce(
    (globalReport, heuristic) => {
      globalReport.reports.push(heuristic.handler(account));
      return globalReport;
    },
    {
      reports: [],
    }
  );

  console.log("REPORT: ", globalReport);
  return globalReport;
}
