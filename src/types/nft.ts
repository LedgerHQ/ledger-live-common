import BigNumber from "bignumber.js";

export type NFT = {
  id: string; // id live
  tokenId: BigNumber; // id on chain
  collection: {
    contract: string;
    name: string;
    totalSupply: number;
    contractSpec: "ERC721" | "ERC1155";
  };
};
