// @flow

import groupBy from "lodash/groupBy";
import pickBy from "lodash/pickBy";
import uniqBy from "lodash/uniqBy";
import flatten from "lodash/flatten";

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

/**
 * Heuristic that checks if at least one address appears in the outputs of more
 * than one operation.
 *
 * Example: sending funds to the same address every time, like an scam exchange.
 *
 * It may produce false positives when used with pending operations.
 */
export const sendAddressReuse: HeuristicHandler = (account: Account) => {
  const groupedOps = groupBy(account.operations, (op) =>
    op.extra.outputs.map((output) => output.address)
  );

  const reusedAddrsMap = pickBy(groupedOps, (x) => x.length > 1);
  const matchedOps = flatten(Object.values(reusedAddrsMap));
  const uniqOps = uniqBy(matchedOps, (op) => op.hash);

  return {
    heuristicId: "send-address-reuse",
    operations: uniqOps,
    penalty: uniqOps.length,
  };
};
