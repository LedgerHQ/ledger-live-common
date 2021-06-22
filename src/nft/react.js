// @flow
import { BigNumber } from "bignumber.js";
import { useMemo } from "react";
import type { NFTList, NFTSortFilterCriterias } from ".";
import type { Currency } from "../types";
import { calculate } from "../countervalues/logic";
import { useCountervaluesState } from "../countervalues/react";
import { sortFilterNFTs } from ".";

export function useNftTotal(list: NFTList, to: Currency) {
  const state = useCountervaluesState();
  return useMemo(
    () =>
      list
        .map((item) => item.nft.lastSale)
        .filter(Boolean)
        .map(({ currency, value }) =>
          BigNumber(
            calculate(state, {
              value: value.toNumber(),
              from: currency,
              to,
            }) || 0
          )
        )
        .reduce((sum, n) => sum.plus(n), BigNumber(0)),
    [state, list, to]
  );
}

export function useSortFilterNFTs(
  list: NFTList,
  {
    sortBy,
    searchQuery,
    filterByAccountId,
    filterByCurrencyId,
    filterByPlatformId,
    filterByCollectionSlug,
  }: NFTSortFilterCriterias
): NFTList {
  return useMemo(
    () =>
      sortFilterNFTs(list, {
        sortBy,
        searchQuery,
        filterByAccountId,
        filterByCurrencyId,
        filterByPlatformId,
        filterByCollectionSlug,
      }),
    [
      list,
      sortBy,
      searchQuery,
      filterByAccountId,
      filterByCurrencyId,
      filterByPlatformId,
      filterByCollectionSlug,
    ]
  );
}
