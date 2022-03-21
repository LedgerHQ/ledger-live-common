import { CryptoCurrency } from "@ledgerhq/cryptoassets";
import { shuffle } from "lodash/fp";
import { useMemo } from "react";
import { useObservable } from "../../observable";
import {
  getCurrentSolanaPreloadData,
  getSolanaPreloadData,
} from "./js-preload-data";
import { SolanaPreloadDataV1, SolanaStake, SolanaStakeWithMeta } from "./types";
import { ValidatorsAppValidator } from "./validator-app";

const LEDGER_VALIDATOR_ADDRESS = "26pV97Ce83ZQ6Kz9XT4td8tdoUFPTng8Fb8gPyc53dJx";

export function useSolanaPreloadData(
  currency: CryptoCurrency
): SolanaPreloadDataV1 | undefined | null {
  return useObservable(
    getSolanaPreloadData(currency),
    getCurrentSolanaPreloadData(currency)
  );
}

export function useLedgerFirstShuffledValidators(currency: CryptoCurrency) {
  const data = useSolanaPreloadData(currency);

  return useMemo(() => {
    return reorderValidators(data?.validators ?? []);
  }, [data]);
}

export function useSolanaStakesWithMeta(
  currency: CryptoCurrency,
  stakes: SolanaStake[]
): SolanaStakeWithMeta[] {
  const data = useSolanaPreloadData(currency);

  if (data === null || data === undefined) {
    return [];
  }

  const { validators } = data;

  const validatorByVoteAccAddr = new Map(
    validators.map((v) => [v.voteAccount, v])
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
          img: validator?.avatarUrl,
          name: validator?.name,
          url: validator?.wwwUrl,
        },
      },
    };
  });
}

function reorderValidators(
  validators: ValidatorsAppValidator[]
): ValidatorsAppValidator[] {
  const shuffledValidators = shuffle(validators);

  // move Ledger validator to the first position
  const ledgerValidatorIdx = shuffledValidators.findIndex(
    (v) => v.voteAccount === LEDGER_VALIDATOR_ADDRESS
  );

  if (ledgerValidatorIdx > -1) {
    const ledgerValidator = shuffledValidators[ledgerValidatorIdx];
    shuffledValidators[ledgerValidatorIdx] = shuffledValidators[0];
    shuffledValidators[0] = ledgerValidator;
  }

  return shuffledValidators;
}
