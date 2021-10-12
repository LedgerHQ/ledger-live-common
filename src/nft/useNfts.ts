import Dataloader from "dataloader";
import { Currency, findCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { useEffect, useMemo, useState } from "react";
import { nftsFromOperations } from "./nftHelpers";
import { API, apiForCurrency, NFTMetadataInput } from "../api/Ethereum";
import { Operation, NFT, NFTWithMetadata, NFTMetadata } from "../types";
import { mergeNfts } from "../bridge/jsHelpers";

type AsyncNFTWithMetadata = NFTWithMetadata & {
  status: "loading" | "loaded" | "error";
};

const currency: Currency = findCryptoCurrencyById("ethereum")!;
const api: API = apiForCurrency(currency);

const metadataLoader = new Dataloader(
  (contractAndTokens: NFTMetadataInput) =>
    api.getNFTMetadata(contractAndTokens),
  {
    cacheKeyFn: ({ contract, tokenId }) => contract + tokenId,
  }
);
let metadataLastUpdate = Date.now();

const mergeNftWithMetadata = (
  nft: NFT,
  metadata?: NFTMetadata | Error
): AsyncNFTWithMetadata => {
  const status = (() => {
    if (!metadata) {
      return "loading";
    } else if (metadata instanceof Error) {
      return "error";
    }

    return "loaded";
  })();

  return {
    status,
    id: nft.id,
    tokenId: nft.tokenId,
    amount: nft.amount,
    nftName: (metadata as NFTMetadata)?.nftName || null,
    picture: (metadata as NFTMetadata)?.picture || null,
    description: (metadata as NFTMetadata)?.description || null,
    properties: (metadata as NFTMetadata)?.properties || null,
    collection: {
      contract: nft.collection.contract,
      standard: nft.collection.standard,
      tokenName: (metadata as NFTMetadata)?.tokenName || null,
    },
  } as AsyncNFTWithMetadata;
};

export const overloadNfts = async (
  nfts: NFT[]
): Promise<AsyncNFTWithMetadata[]> => {
  const contractAndTokens = nfts
    .filter(Boolean)
    .map(({ collection: { contract }, tokenId }) => ({
      contract,
      tokenId,
    }));

  const nftsMetadata: Array<NFTMetadata | Error> = await Promise.allSettled(
    contractAndTokens.map((c) => metadataLoader.load(c))
  ).then((res) =>
    res.map((p) => (p.status === "fulfilled" ? p.value : p.reason))
  );

  return (nfts || []).map((nft: NFT, index) => {
    return mergeNftWithMetadata(nft, nftsMetadata[index]);
  });
};

/**
 * @warning ⚠️ nftsOrOps is going to be the dependency of a useEffect/useMemo,
 * therefore it needs to be reference or a memoized value or it will lead to a memory leak ⚠️
 */
export const useNfts = (
  nftsOrOps: NFT | NFT[] | Operation | Operation[]
): [AsyncNFTWithMetadata | AsyncNFTWithMetadata[], typeof refreshNft] => {
  const [overloadedNfts, setOverloadedNfts] = useState<AsyncNFTWithMetadata[]>(
    []
  );

  const refreshNft = async (
    nftOrNfts?: AsyncNFTWithMetadata | AsyncNFTWithMetadata[]
  ): Promise<void> => {
    const nftsToRefresh: AsyncNFTWithMetadata[] = (() => {
      if (!nftOrNfts) {
        return overloadedNfts;
      }

      return Array.isArray(nftOrNfts) ? nftOrNfts : [nftOrNfts];
    })();

    // Set the nfts to refresh as loading
    setOverloadedNfts(
      overloadedNfts.map((nft) =>
        nftsToRefresh.includes(nft) ? mergeNftWithMetadata(nft) : nft
      )
    );

    const refreshedMetadata: NFTMetadata[] = await Promise.allSettled(
      nftsToRefresh
        .map(({ collection: { contract }, tokenId }) => ({
          contract,
          tokenId,
        }))
        .map((c) => metadataLoader.clear(c).load(c))
    ).then((res) =>
      res.map((p) => (p.status === "fulfilled" ? p.value : p.reason))
    );

    // Will make all useNfts hooks rerender to get the update
    metadataLastUpdate = Date.now();

    const newNfts = nftsToRefresh.map((nft, i) =>
      mergeNftWithMetadata(nft, refreshedMetadata[i])
    );
    setOverloadedNfts(
      mergeNfts(overloadedNfts, newNfts) as AsyncNFTWithMetadata[]
    );
  };

  const nfts = useMemo(() => {
    // get single nft as array if needed
    const nftsAsArray = Array.isArray(nftsOrOps) ? nftsOrOps : [nftsOrOps];
    // if entry has a hash it's an NFT Operation, not an NFT
    return (nftsAsArray[0] as Operation)?.hash
      ? nftsFromOperations(nftsAsArray as Operation[])
      : (nftsAsArray as NFT[]);
  }, [nftsOrOps]);

  // Set all the nfts as loading at init
  useEffect(() => {
    setOverloadedNfts(nfts.map((nft) => mergeNftWithMetadata(nft)));
  }, []);

  useEffect(() => {
    overloadNfts(nfts).then((nfts) => {
      setOverloadedNfts(nfts);
    });
  }, [nfts, metadataLastUpdate]);

  return [
    Array.isArray(nftsOrOps) ? overloadedNfts : overloadedNfts[0],
    refreshNft,
  ];
};
