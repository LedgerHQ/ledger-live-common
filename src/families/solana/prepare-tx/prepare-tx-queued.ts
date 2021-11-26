import type { PrepareTxAPI } from "../types";
import { lazy, runQueued } from "../utils";

export function getPrepareTxAPIQueued(api: PrepareTxAPI): PrepareTxAPI {
  return {
    findAssociatedTokenAccountPubkey: (owner, mint) =>
      runQueued(lazy(api.findAssociatedTokenAccountPubkey)(owner, mint)),

    getBalance: (address) => runQueued(lazy(api.getBalance)(address)),

    getAssociatedTokenAccountCreationFee: () =>
      runQueued(lazy(api.getAssociatedTokenAccountCreationFee)()),

    getTxFeeCalculator: () => runQueued(lazy(api.getTxFeeCalculator)()),

    getMaybeTokenAccount: (address) =>
      runQueued(lazy(api.getMaybeTokenAccount)(address)),

    config: api.config,
  };
}
