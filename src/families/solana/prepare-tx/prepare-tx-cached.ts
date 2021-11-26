import type { PrepareTxAPI } from "../types";
import { makeLRUCache } from "../../../cache";
import {
  findAssociatedTokenAccountPubkey,
  getAssociatedTokenAccountCreationFee,
  getBalance,
  getMaybeTokenAccount,
  getTxFeeCalculator,
} from "../api";

export function minutes(num: number, max = 100) {
  return {
    max,
    maxAge: num * 60 * 1000,
  };
}

const cacheKeyCluster = (api: PrepareTxAPI) => api.config.cluster;
const cacheKeyAddress = (address: string) => address;
const cacheKeyEmpty = () => "" as const;
const cacheKeyAssocTokenAccAddress = (owner: string, mint: string) =>
  `${owner}:${mint}`;

export async function getPrepareTxAPICached(
  api: PrepareTxAPI
): Promise<PrepareTxAPI> {
  return {
    findAssociatedTokenAccountPubkey: findAssociatedTokenAccountPubkeyCached,
    getBalance: await getBalanceCached(api),
    getAssociatedTokenAccountCreationFee:
      await getAssociatedTokenAccountCreationFeeCached(api),
    getTxFeeCalculator: await getTxFeeCalculatorCached(api),
    getMaybeTokenAccount: await getMaybeTokenAccountCached(api),
    config: api.config,
  };
}

const getBalanceCached = makeLRUCache(
  (api: PrepareTxAPI) =>
    Promise.resolve(
      makeLRUCache(getBalance(api.config), cacheKeyAddress, minutes(1))
    ),
  cacheKeyCluster,
  minutes(1000)
);

const getAssociatedTokenAccountCreationFeeCached = makeLRUCache(
  (api: PrepareTxAPI) =>
    Promise.resolve(
      makeLRUCache(
        getAssociatedTokenAccountCreationFee(api.config),
        cacheKeyEmpty,
        minutes(5)
      )
    ),
  cacheKeyCluster,
  minutes(1000)
);

const getTxFeeCalculatorCached = makeLRUCache(
  (api: PrepareTxAPI) =>
    Promise.resolve(
      makeLRUCache(getTxFeeCalculator(api.config), cacheKeyEmpty, minutes(5))
    ),
  cacheKeyCluster,
  minutes(1000)
);

const getMaybeTokenAccountCached = makeLRUCache(
  (api: PrepareTxAPI) =>
    Promise.resolve(
      makeLRUCache(
        getMaybeTokenAccount(api.config),
        cacheKeyAddress,
        minutes(1)
      )
    ),
  cacheKeyCluster,
  minutes(1000)
);

const findAssociatedTokenAccountPubkeyCached = makeLRUCache(
  findAssociatedTokenAccountPubkey,
  cacheKeyAssocTokenAccAddress,
  minutes(1000)
);
