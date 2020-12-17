// @flow

import uniq from "lodash/uniq";
import { BigNumber } from "bignumber.js";

import type { HeuristicHandler } from "../types";
import type { Account } from "../../../../types";

// Source: https://support.samourai.io/article/81-understanding-pools-and-pool-fees
const samouraiPools = [
  BigNumber(1000000),
  BigNumber(5000000),
  BigNumber(50000000),
];

const maxSamouraiPoolFee = BigNumber(110000);

/**
 * Checks if an operation is a Samourai  Whirlpool.
 *
 * Source: https://github.com/nopara73/WasabiVsSamourai/blob/f8174e607363007ddf212ca17e93608c0d2e42f2/WasabiVsSamourai/CoinJoinIndexer.cs#L107
 */
export const samouraiWhirlpool: HeuristicHandler = (account: Account) => {
  return account.operations.reduce(
    (report, op) => {
      const tx = op.transaction;

      if (
        tx.inputs.length === 5 &&
        tx.outputs.length === 5 &&
        uniq(tx.outputs.map((out) => out.value.toString())).length === 1 &&
        samouraiPools.some((pool) =>
          pool
            .minus(tx.outputs[0].value)
            .abs()
            .isLessThanOrEqualTo(maxSamouraiPoolFee)
        )
      ) {
        report.operations.push(op);
        report.penalty += 1;
      }

      return report;
    },
    {
      heuristicId: "samourai-whirlpool",
      operations: [],
      penalty: 0,
    }
  );
};
