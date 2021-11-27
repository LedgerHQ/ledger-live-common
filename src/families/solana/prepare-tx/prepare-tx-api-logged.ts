import type { PrepareTxAPI } from "../types";

export function getPrepareTxAPILogged(api: PrepareTxAPI): PrepareTxAPI {
  return {
    findAssociatedTokenAccountPubkey: (owner, mint) =>
      log(
        "findAssociatedTokenAccountPubkey",
        { owner, mint },
        api.findAssociatedTokenAccountPubkey.bind(this, owner, mint)
      ),

    getBalance: (address) =>
      log("getBalance", { address }, api.getBalance.bind(this, address)),

    getAssociatedTokenAccountCreationFee: () =>
      log(
        "getAssociatedTokenAccountCreationFee",
        {},
        api.getAssociatedTokenAccountCreationFee
      ),

    getTxFeeCalculator: () =>
      log("getTxFeeCalculator", {}, api.getTxFeeCalculator),

    getMaybeTokenAccount: (address) =>
      log(
        "getMaybeTokenAccount",
        { address },
        api.getMaybeTokenAccount.bind(this, address)
      ),

    config: api.config,
  };
}

async function log(
  tag: string,
  params: Record<string, unknown>,
  lazyPromise: () => Promise<any>
) {
  const answer = await lazyPromise();
  console.log({
    tag,
    params,
    answer,
  });
  return answer;
}
