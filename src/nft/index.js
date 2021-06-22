// @flow
import type { Account, NFT } from "../types";

export type NFTItem = {
  account: Account,
  nft: NFT,
};

export type NFTList = NFTItem[];

export function aggregateNFTs(accounts: Account[]): NFTList {
  const nfts = [];
  accounts.forEach((account) => {
    (account.nfts || []).forEach((nft) => {
      nfts.push({ account, nft });
    });
  });
  return nfts;
}

export type NFTSortFilterCriterias = {
  sortBy: "oldest" | "newest",
  searchQuery: string,
  filterByAccountId: ?string,
  filterByCurrencyId: ?string,
  filterByPlatformId: ?string,
  filterByCollectionSlug: ?string,
};

export function sortFilterNFTs(
  list: NFTList,
  opts: NFTSortFilterCriterias
): NFTList {
  let search = opts.searchQuery.toLowerCase();
  const nfts = [...list].filter(({ nft, account }) => {
    if (search) {
      const searchable = [
        nft.name,
        nft.description,
        nft.creator.name,
        nft.platform?.name,
        nft.collection?.name,
      ]
        .filter(Boolean)
        .join("|")
        .toLowerCase();
      if (!searchable.includes(search)) {
        return false;
      }
    }
    if (opts.filterByAccountId && account.id !== opts.filterByAccountId) {
      return false;
    }
    if (
      opts.filterByCurrencyId &&
      account.currency.id !== opts.filterByCurrencyId
    ) {
      return false;
    }
    if (
      opts.filterByPlatformId &&
      nft.platform?.name !== opts.filterByPlatformId
    ) {
      return false;
    }
    if (
      opts.filterByCollectionSlug &&
      nft.collection?.slug !== opts.filterByCollectionSlug
    ) {
      return false;
    }
    return true;
  });

  nfts.sort((a, b) =>
    !a.nft.lastActivityDate && !b.nft.lastActivityDate
      ? 0
      : (a.nft.lastActivityDate < b.nft.lastActivityDate ? 1 : -1) *
        (opts.sortBy === "oldest" ? 1 : -1)
  );

  return nfts;
}
