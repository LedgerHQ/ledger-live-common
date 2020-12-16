// @flow

import groupBy from "lodash/groupBy";
import pickBy from "lodash/pickBy";

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

/**
 * Heuristic that checks if at least one address appears in the inputs of more
 * than one operation.
 *
 * It may produce false positives when used with pending operations.
 */
export const receiveAddressReuse: HeuristicHandler = (account: Account) => {
  const groupedOps = groupBy(account.operations, (op) =>
    op.transaction.inputs.map((input) => input.address)
  );

  const matchedOps = Object.values(pickBy(groupedOps, (x) => x.length > 1));

  return matchedOps.length > 0
    ? {
        heuristicId: "receive-address-reuse",
        operations: matchedOps,
        penalty: 4,
      }
    : {
        heuristicId: "receive-address-reuse",
        operations: [],
        penalty: 0,
      };
};
