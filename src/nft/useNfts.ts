import Dataloader from "dataloader";
import { Currency, findCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { useEffect, useState } from "react";
import { nftsFromOperations } from "./nftHelpers";
import { API, apiForCurrency, NFTMetadataInput } from "../api/Ethereum";
import { Operation, NFT, NFTWithMetadata, NFTMetadata } from "../types";
import { mergeNfts } from "../bridge/jsHelpers";

type AnyNFT = NFT | NFTWithMetadata;

const currency: Currency = findCryptoCurrencyById("ethereum")!;
const api: API = apiForCurrency(currency);

const metadataLoader = new Dataloader(
  (contractAndTokens: NFTMetadataInput) =>
    api.getNFTMetadata(contractAndTokens),
  { cacheKeyFn: ({ contract, tokenId }) => contract + tokenId }
);

const mergeNftWithMetadata = (
  nft: NFT,
  metadata: NFTMetadata
): NFTWithMetadata => {
  if (!nft || !metadata) {
    return {} as NFTWithMetadata;
  }

  return {
    id: nft.id,
    tokenId: nft.tokenId,
    amount: nft.amount,
    nftName: metadata.nftName,
    picture: metadata.picture,
    description: metadata.description,
    properties: metadata.properties,
    collection: {
      contract: nft.collection.contract,
      standard: nft.collection.standard,
      tokenName: metadata.tokenName,
    },
  } as NFTWithMetadata;
};

export const overloadNfts = async (
  _nftsOrOps: NFT | NFT[] | Operation | Operation[]
): Promise<NFTWithMetadata[]> => {
  const nftsOrOps = Array.isArray(_nftsOrOps) ? _nftsOrOps : [_nftsOrOps];
  // if entry has a hash it's an NFT Operation, not an NFT
  const nfts = (nftsOrOps[0] as Operation)?.hash
    ? nftsFromOperations(nftsOrOps as Operation[])
    : (nftsOrOps as NFT[]);

  const NFTMetadata = await Promise.all(
    nfts
      .filter(Boolean)
      .map(({ collection: { contract }, tokenId }) => ({
        contract,
        tokenId,
      }))
      .map((c) => metadataLoader.load(c))
  );

  return (nfts || []).map((nft: NFT, index) => {
    const metadata = (
      !(NFTMetadata instanceof Error) ? NFTMetadata[index] : {}
    ) as NFTMetadata;

    return mergeNftWithMetadata(nft, metadata);
  });
};

/**
 * @warning ⚠️ nftsOrOps is going to be the dependency of a useEffect,
 * therefore it needs to be reference or a memoized value or it will lead to a memory leak ⚠️
 */
export const useNfts = (
  nftsOrOps: NFT | NFT[] | Operation | Operation[]
): [NFTWithMetadata | NFTWithMetadata[], typeof refreshNft] => {
  const [overloadedNfts, setOverloadedNfts] = useState<NFTWithMetadata[]>([]);

  async function refreshNft(): Promise<void>;
  async function refreshNft(nftOrNfts: AnyNFT | AnyNFT[]): Promise<void>;
  async function refreshNft(nftOrNfts?: AnyNFT | AnyNFT[]): Promise<void> {
    const nftsToRefresh: AnyNFT[] = (() => {
      if (!nftOrNfts) {
        return overloadedNfts;
      }

      return Array.isArray(nftOrNfts) ? nftOrNfts : [nftOrNfts];
    })();

    const refreshedMetadata: NFTMetadata[] = await Promise.all(
      nftsToRefresh
        .map(({ collection: { contract }, tokenId }) => ({
          contract,
          tokenId,
        }))
        .map((c) => metadataLoader.clear(c).load(c))
    );

    const newNfts = nftsToRefresh.map((nft, i) =>
      mergeNftWithMetadata(nft, refreshedMetadata[i])
    );

    setOverloadedNfts(mergeNfts(overloadedNfts, newNfts) as NFTWithMetadata[]);
  }

  useEffect(() => {
    overloadNfts(nftsOrOps).then(setOverloadedNfts);
  }, [nftsOrOps]);

  return [
    Array.isArray(nftsOrOps) ? overloadedNfts : overloadedNfts[0],
    refreshNft,
  ];
};
