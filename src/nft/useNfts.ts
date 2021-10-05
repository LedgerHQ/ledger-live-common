import Dataloader from "dataloader";
import { Currency, findCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { useEffect, useState } from "react";
import { nftsFromOperations } from "./nftHelpers";
import { API, apiForCurrency, NFTMetadataInput } from "../api/Ethereum";
import { Operation, NFT, NFTWithMetadata, NFTMetadata } from "../types";

const currency: Currency = findCryptoCurrencyById("ethereum")!;
const api: API = apiForCurrency(currency);

const metadataLoader = new Dataloader(
  (contractAndTokens: NFTMetadataInput) =>
    api.getNFTMetadata(contractAndTokens),
  { cacheKeyFn: ({ contract, tokenId }) => contract + tokenId }
);

export const overloadNfts = async (
  nftsOrOps: NFT[] | Operation[]
): Promise<NFTWithMetadata[]> => {
  // if entry has a hash it's an NFT Operation, not an NFT
  const nfts = (nftsOrOps[0] as Operation)?.hash
    ? nftsFromOperations(nftsOrOps as Operation[])
    : (nftsOrOps as NFT[]);

  const NFTMetadata = await Promise.all(
    nfts
      .map(({ collection: { contract }, tokenId }) => ({
        contract,
        tokenId,
      }))
      .map((c) => metadataLoader.load(c))
  );

  return (nfts || []).map((nft: NFT, index) => {
    const md = (
      !(NFTMetadata instanceof Error) ? NFTMetadata[index] : {}
    ) as NFTMetadata;

    return {
      id: nft.id,
      tokenId: nft.tokenId,
      amount: nft.amount,
      nftName: md.nftName,
      picture: md.picture,
      description: md.description,
      properties: md.properties,
      collection: {
        contract: nft.collection.contract,
        standard: nft.collection.standard,
        tokenName: md.tokenName,
      },
    } as NFTWithMetadata;
  });
};

/**
 * Hook to get NFTs overloaded with the metadata
 *
 * @param nftsOrOps @warning This need to be either a memoized variable or a static reference or you will create a memory leak
 * @returns {NFT[]}
 */
export const useNfts = (nftsOrOps: NFT[] | Operation[]): NFTWithMetadata[] => {
  const [overloadedNfts, setOverloadedNfts] = useState<NFTWithMetadata[]>([]);

  useEffect(() => {
    overloadNfts(nftsOrOps).then(setOverloadedNfts);
  }, [nftsOrOps]);

  return overloadedNfts;
};
