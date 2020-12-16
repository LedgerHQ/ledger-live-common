// @flow

import trimEnd from "lodash/trimEnd";

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

export const roundValue: HeuristicHandler = (account: Account) => {
  return account.operations.reduce(
    (report, op) => {
      const isRound = op.transaction.outputs.some((output) => {
        const roundingFactor =
          trimEnd(output.value.toString(), "0").length /
          output.value.toString().length;

        return roundingFactor < 0.25;
      });

      if (isRound) {
        report.operations.push(op);
        report.penalty += 1; // The penalty costs 1 unit.
      }

      return report;
    },
    {
      heuristicId: "round-value",
      operations: [],
      penalty: 0,
    }
  );
};
