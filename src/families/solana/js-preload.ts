import { CryptoCurrency } from "@ledgerhq/cryptoassets";
import { ChainAPI } from "./api";
import { SolanaPreloadData, SolanaPreloadDataV1 } from "./types";
import { assertUnreachable } from "./utils";
import { setSolanaPreloadData as setPreloadData } from "./js-preload-data";
import { getValidators } from "./validator-app";

export async function preloadWithAPI(
  currency: CryptoCurrency,
  getAPI: () => Promise<ChainAPI>
): Promise<Record<string, any>> {
  const api = await getAPI();

  const voteAccs = await api.getVoteAccounts();

  const data: SolanaPreloadData = {
    version: "1",
    validatorsWithMeta: voteAccs.current.map((acc) => ({
      validator: {
        voteAccAddr: acc.votePubkey,
        activatedStake: acc.activatedStake,
        commission: acc.commission,
      },
      meta: {},
    })),
    validators: await getValidators(),
  };

  setPreloadData(data, currency);

  return data;
}

export function hydrate(
  data: SolanaPreloadData,
  currency: CryptoCurrency
): void {
  switch (data.version) {
    case "1":
      hydrateV1(data, currency);
      return;
    case "2":
      throw new Error(
        "version 2 for now exists only to support discriminated union"
      );
    default:
      return assertUnreachable(data);
  }
}

function hydrateV1(data: SolanaPreloadDataV1, currency: CryptoCurrency) {
  setPreloadData(data, currency);
}
