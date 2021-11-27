import type { PrepareTxAPI } from "../types";
import { asyncQueue } from "../utils";

export function getPrepareTxAPIQueued(
  api: PrepareTxAPI,
  delayBetweenRuns = 100
): PrepareTxAPI {
  const q = asyncQueue({
    delayBetweenRuns,
  });

  return {
    findAssociatedTokenAccountPubkey: (owner, mint) =>
      q.submit(api.findAssociatedTokenAccountPubkey.bind(this, owner, mint)),
    getBalance: (address) => q.submit(api.getBalance.bind(this, address)),

    getAssociatedTokenAccountCreationFee: () =>
      q.submit(api.getAssociatedTokenAccountCreationFee),

    getTxFeeCalculator: () => q.submit(api.getTxFeeCalculator),

    getMaybeTokenAccount: (address) =>
      q.submit(api.getMaybeTokenAccount.bind(this, address)),

    config: api.config,
  };
}
