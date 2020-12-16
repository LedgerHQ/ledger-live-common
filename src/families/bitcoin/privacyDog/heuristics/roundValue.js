// @flow

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

export const roundValue: HeuristicHandler = (account: Account) => {
  console.log(account.operations)
  return account.operations.reduce(
    (report, operation) => {
      console.log("ops: ", operation)
      const isRound = operation.outputs.every((output) => {
        console.log(output.value, output.value.toString());
        return true;
      });

      return report;
    },
    {
      id: "round-value",
      operations: [],
      penalty: 0,
    }
  );
};
