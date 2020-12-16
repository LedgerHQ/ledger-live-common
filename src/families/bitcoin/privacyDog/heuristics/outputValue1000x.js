// @flow

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

export const outputValue1000x: HeuristicHandler = (account: Account) => {
  return account.operations.reduce(
    (report, op) => {
      if (op.transaction.outputs.length !== 2) {
        return report;
      }

      const [out1, out2] = op.transaction.outputs;

      if (
        out1.value.div(out2.value) > 1000 ||
        out2.value.div(out1.value) > 1000
      ) {
        report.operations.push(op);
        report.penalty += 1;
      }

      return report;
    },
    {
      heuristicId: "output-value-1000x",
      operations: [],
      penalty: 0,
    }
  );
};
