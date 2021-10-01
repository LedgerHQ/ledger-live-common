import memoize from "lodash/memoize";
import { useEffect, useState } from "react";
import { nftsFromOperations } from "./nftHelpers";
import { apiForCurrency, NFTMetadataOutput } from "../api/Ethereum";
import { CryptoCurrency, Operation, NFT, NFTWithMetadata } from "../types";

export const overloadNfts = async (
  nftsOrOps: NFT[] | Operation[],
  currency: CryptoCurrency
): Promise<NFTWithMetadata[]> => {
  const api = apiForCurrency(currency);

  // if entry has a hash it's an NFT Operation, not an NFT
  const nfts = (nftsOrOps[0] as Operation)?.hash
    ? nftsFromOperations(nftsOrOps as Operation[])
    : (nftsOrOps as NFT[]);

  const NFTMetadata: NFTMetadataOutput = await api.getNFTMetadata(
    nfts.map(({ collection: { contract }, tokenId }) => ({
      contract,
      tokenId,
    }))
  );

  return (nfts || []).map((nft: NFT) => {
    const md =
      NFTMetadata?.[nft.collection.contract?.toLowerCase()]?.[nft.tokenId] ??
      {};

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

const memoOverloadNfts = memoize(overloadNfts);

/**
 * Hook to get NFTs overloaded with the metadata
 *
 * @param {NFT[] | Operation[]} nftsOrOps @warning This need to be either a memoized variable or a static reference or you will create a memory leak
 * @param {CryptoCurrency} currency
 * @returns {NFTWithMetadata[]}
 */
export const useNfts = (
  nftsOrOps: NFT[] | Operation[],
  currency: CryptoCurrency
): NFTWithMetadata[] => {
  const [overloadedNfts, setOverloadedNfts] = useState<NFTWithMetadata[]>([]);

  useEffect(() => {
    memoOverloadNfts(nftsOrOps, currency).then(setOverloadedNfts);
  }, [nftsOrOps, currency]);

  return overloadedNfts;
};
