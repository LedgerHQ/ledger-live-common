// @flow

import uniq from "lodash/uniq";

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

import { getScriptType } from "../protocol/script";

/**
 * Checks if all inputs have the same type, and exactly one of the outputs is
 * not of the same type — this output can be considered as the recipient.
 */
export const scriptTypes: HeuristicHandler = (account: Account) => {
  return account.operations.reduce(
    (report, op) => {
      const { outputs, inputs } = op.extra;

      const inputScriptTypes = uniq(
        inputs.map((input) => getScriptType(input.address))
      );

      const outputScriptTypes = uniq(
        outputs.map((input) => getScriptType(input.address))
      );

      if (inputScriptTypes.includes("UNKNOWN")) {
        return report;
      }

      if (
        inputScriptTypes.length === 1 &&
        outputScriptTypes.length === 2 &&
        outputScriptTypes.includes(inputScriptTypes[0])
      ) {
        report.operations.push(op);
        report.penalty += 1; // The penalty costs 1 unit.
      }

      return report;
    },
    {
      heuristicId: "script-types",
      operations: [],
      penalty: 0,
    }
  );
};
