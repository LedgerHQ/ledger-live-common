// @flow

import countBy from "lodash/countBy";

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

/**
 *
 * Checks if an operation is a simple CoinJoin.
 *
 * Ported from: https://github.com/citp/BlockSci/blob/67ee51d6c89e145e879181c7f934fddb4ce3b54b/src/heuristics/tx_identification.cpp
 */
export const simpleCoinjoin: HeuristicHandler = (account: Account) => {
  return account.operations.reduce(
    (report, op) => {
      const { inputs, outputs } = op.extra;

      if (inputs.length < 2 || outputs.length < 3) {
        return report;
      }

      const participantCount = (outputs.length + 1) / 2;
      if (participantCount > inputs.length) {
        return report;
      }

      const inputAddresses = inputs.map((input) => input.address);
      if (participantCount > inputAddresses.length) {
        return report;
      }

      const outputValues = countBy(outputs.map((output) => output.value));
      const maxOutputValueCount = Object.keys(outputValues).reduce(
        (a, v) => Math.max(a, outputValues[v]),
        -Infinity
      );
      if (maxOutputValueCount != participantCount) {
        return report;
      }

      if (
        Object.keys(outputValues)
          .filter((v) => outputValues[v] === maxOutputValueCount)
          .map((v) => ["546", "2730"].includes(v.toString()))
          .some((v) => v === true)
      ) {
        return report;
      }

      report.operations.push(op);
      report.penalty += 1; // The penalty costs 1 unit.

      return report;
    },
    {
      heuristicId: "simple-coinjoin",
      operations: [],
      penalty: 0,
    }
  );
};
