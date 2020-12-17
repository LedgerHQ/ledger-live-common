// @flow

import type { Account } from "../../../types";
import { heuristics } from "./heuristics";
import type { GlobalHeuristicReport } from "./types";
import { HeuristicReport } from "./types";

export function generateSecurityAudit(account: Account) {
  const totalWeight = heuristics.reduce(
    (total, h) => total + h.penaltyFactor,
    0
  );
  console.log("Total Weight =>");
  console.log(totalWeight);
  const globalReport: GlobalHeuristicReport = heuristics.reduce(
    (globalReport, heuristic) => {
      let report: HeuristicReport = heuristic.handler(account);
      globalReport.reports.push(report);
      globalReport.score +=
        ((report.penalty / account.operations.length) * totalWeight) / 100.0;
      console.log("report.penalty / account.operations.length =>");
      console.log(report.penalty / account.operations.length);
      return globalReport;
    },
    {
      reports: [],
    }
  );

  if (globalReport.score > 60) {
    globalReport.level = "good";
  } else if (globalReport.score > 30) {
    globalReport.level = "better";
  } else {
    globalReport.level = "best";
  }
  console.log("REPORT: ", globalReport);
  return globalReport;
}
