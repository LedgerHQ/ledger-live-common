import { CryptoCurrency } from "@ledgerhq/cryptoassets";
import { useObservable } from "../../observable";
import {
  getCurrentSolanaPreloadData,
  getSolanaPreloadData,
} from "./js-preload-data";
import { SolanaPreloadDataV1, SolanaStake, SolanaStakeWithMeta } from "./types";

export function useSolanaPreloadData(
  currency: CryptoCurrency
): SolanaPreloadDataV1 | undefined | null {
  return useObservable(
    getSolanaPreloadData(currency),
    getCurrentSolanaPreloadData(currency)
  );
}

export function useSolanaStakesWithMeta(
  currency: CryptoCurrency,
  stakes: SolanaStake[]
): SolanaStakeWithMeta[] {
  const data = useSolanaPreloadData(currency);

  if (data === null || data === undefined) {
    return [];
  }

  const { validatorsWithMeta } = data;

  const validatorByVoteAccAddr = new Map(
    validatorsWithMeta.map((validatorWithMeta) => [
      validatorWithMeta.validator.voteAccAddr,
      validatorWithMeta,
    ])
  );

  return stakes.map((stake) => {
    const voteAccAddr = stake.delegation?.voteAccAddr;
    const validator =
      voteAccAddr === undefined
        ? undefined
        : validatorByVoteAccAddr.get(voteAccAddr);

    return {
      stake,
      meta: {
        validator: {
          img: undefined,
          name: validator?.meta.name,
        },
      },
    };
  });
}
