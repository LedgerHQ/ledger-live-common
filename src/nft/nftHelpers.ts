import { NFT, NFTWithMetadata } from "../types";

type AnyNFT = NFT | NFTWithMetadata;
type Collection = NFT["collection"] | NFTWithMetadata["collection"];

type CollectionMap<C> = Record<string, C>;

export type CollectionWithNFT = Collection & {
  nfts: Array<Omit<AnyNFT, "collection">>;
};

export const nftsByCollections = (
  nfts: AnyNFT[] = [],
  collectionAddress?: string
): CollectionWithNFT[] => {
  const filteredNfts = collectionAddress
    ? nfts.filter((n) => n.collection.contract === collectionAddress)
    : nfts;

  const collectionMap = filteredNfts.reduce(
    (acc: CollectionMap<CollectionWithNFT>, nft: AnyNFT) => {
      const { collection, ...nftWithoutCollection } = nft;

      if (!acc[collection.contract]) {
        acc[collection.contract] = { ...collection, nfts: [] };
      }
      acc[collection.contract].nfts.push(nftWithoutCollection);

      return acc;
    },
    {} as CollectionMap<CollectionWithNFT>
  );

  return Object.values(collectionMap);
};
