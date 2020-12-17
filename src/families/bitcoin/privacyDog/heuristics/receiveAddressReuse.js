// @flow

import groupBy from "lodash/groupBy";
import pickBy from "lodash/pickBy";
import uniqBy from "lodash/uniqBy";
import flatten from "lodash/flatten";

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

/**
 * Heuristic that checks if at least one address appears in the inputs of more
 * than one operation.
 *
 * Example: using the same address everytime while receiving funds from an
 * exchange.
 *
 * It may produce false positives when used with pending operations.
 */
export const receiveAddressReuse: HeuristicHandler = (account: Account) => {
  const groupedOps = groupBy(account.operations, (op) =>
    op.extra.inputs.map((input) => input.address)
  );

  const reusedAddrsMap = pickBy(groupedOps, (x) => x.length > 1);
  const matchedOps = flatten(Object.values(reusedAddrsMap));
  const uniqOps = uniqBy(matchedOps, (op) => op.hash);

  return {
    heuristicId: "receive-address-reuse",
    operations: uniqOps,
    penalty: uniqOps.length,
  };
};
