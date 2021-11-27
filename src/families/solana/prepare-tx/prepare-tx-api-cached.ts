import type { PrepareTxAPI } from "../types";
import { makeLRUCache } from "../../../cache";

export function minutes(num: number, max = 100) {
  return {
    max,
    maxAge: num * 60 * 1000,
  };
}

const cacheKeyAddress = (address: string) => address;
const cacheKeyEmpty = () => "" as const;
const cacheKeyAssocTokenAccAddress = (owner: string, mint: string) =>
  `${owner}:${mint}`;

export function getPrepareTxAPICached(api: PrepareTxAPI): PrepareTxAPI {
  return {
    findAssociatedTokenAccountPubkey:
      findAssociatedTokenAccountPubkeyCached(api),
    getBalance: getBalanceCached(api),
    getAssociatedTokenAccountCreationFee:
      getAssociatedTokenAccountCreationFeeCached(api),
    getTxFeeCalculator: getTxFeeCalculatorCached(api),
    getMaybeTokenAccount: getMaybeTokenAccountCached(api),
    config: api.config,
  };
}

const getBalanceCached = (api: PrepareTxAPI) =>
  makeLRUCache(api.getBalance, cacheKeyAddress, minutes(1));

const getAssociatedTokenAccountCreationFeeCached = (api: PrepareTxAPI) =>
  makeLRUCache(
    api.getAssociatedTokenAccountCreationFee,
    cacheKeyEmpty,
    minutes(5)
  );

const getTxFeeCalculatorCached = (api: PrepareTxAPI) =>
  makeLRUCache(api.getTxFeeCalculator, cacheKeyEmpty, minutes(5));

const getMaybeTokenAccountCached = (api: PrepareTxAPI) =>
  makeLRUCache(api.getMaybeTokenAccount, cacheKeyAddress, minutes(1));

const findAssociatedTokenAccountPubkeyCached = (api: PrepareTxAPI) =>
  makeLRUCache(
    api.findAssociatedTokenAccountPubkey,
    cacheKeyAssocTokenAccAddress,
    minutes(1000)
  );
