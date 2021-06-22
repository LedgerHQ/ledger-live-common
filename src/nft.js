// @flow
import type { Account, NFT } from "./types";

export type SortBy = "default";

export function aggregateNFTs(
  accounts: Account[],
  _options: {
    sortBy: SortBy,
  }
): Array<{
  account: Account,
  nft: NFT,
}> {
  const nfts = [];
  accounts.forEach((account) => {
    (account.nfts || []).forEach((nft) => {
      nfts.push({ account, nft });
    });
  });
  return nfts;
}
