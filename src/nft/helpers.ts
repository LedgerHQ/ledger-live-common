import eip55 from "eip55";
import BigNumber from "bignumber.js";
import { encodeNftId } from ".";
import { decodeAccountId } from "../account";

import type { Operation, ProtoNFT, NFT } from "../types";

export const nftsFromOperations = (ops: Operation[]): ProtoNFT[] => {
  const nftsMap = ops
    // if ops are Operations get the prop nftOperations, else ops are considered nftOperations already
    .flatMap((op) => (op?.nftOperations?.length ? op.nftOperations : op))
    .reduce((acc: Record<string, ProtoNFT>, nftOp: Operation) => {
      let { contract } = nftOp;
      if (!contract) {
        return acc;
      }

      // Creating a "token for a contract" unique key
      contract = eip55.encode(contract);
      const { tokenId, standard, accountId } = nftOp;
      const { currencyId } = decodeAccountId(nftOp.accountId);
      if (!tokenId || !standard) return acc;
      const id = encodeNftId(accountId, contract, tokenId, currencyId);

      const nft = (acc[id] || {
        id,
        tokenId,
        amount: new BigNumber(0),
        contract,
        standard,
        currencyId,
      }) as ProtoNFT;

      if (nftOp.type === "NFT_IN") {
        nft.amount = nft.amount.plus(nftOp.value);
      } else if (nftOp.type === "NFT_OUT") {
        nft.amount = nft.amount.minus(nftOp.value);
      }

      acc[id] = nft;

      return acc;
    }, {});

  return Object.values(nftsMap);
};

export const nftsByCollections = (
  nfts: Array<ProtoNFT | NFT> = [],
  collectionAddress?: string
): Record<string, Array<ProtoNFT | NFT>> | Array<ProtoNFT | NFT> => {
  return collectionAddress
    ? nfts?.filter((n) => n.contract === collectionAddress)
    : nfts.reduce((acc, nft) => {
        const { contract } = nft;

        if (!acc[contract]) {
          acc[contract] = [];
        }
        acc[contract].push(nft);

        return acc;
      }, {});
};

export const getNftKey = (
  contract: string,
  tokenId: string,
  currencyId: string
): string => {
  return `${currencyId}-${contract}-${tokenId}`;
};
