import type BigNumber from "bignumber.js";

export type NFTStandards = "ERC721" | "ERC1155";

export type NFT = {
  // id crafted by live
  id: string;
  // id on chain
  tokenId: string;
  amount: BigNumber;
  collection: {
    // contract address. Careful 1 contract address != 1 collection as some collections are off-chain
    // So 1 contract address from OpenSea for example can reprensent an infinity of collections
    contract: string;
    // Carefull to non spec compliant NFTs (cryptopunks, cryptokitties, ethrock, and others?)
    standard: NFTStandards | string;
  };
};

export type NFTRaw = Omit<NFT, "amount"> & {
  amount: string;
};

export type NFTMetadataProviders = "openSea" | "rarible";

export type NFTMetadata = {
  contract: string;
  tokenId: string;
  tokenName: string | null;
  nftName: string | null;
  picture: string | null;
  description: string | null;
  properties?: Array<Record<"key" | "value", string>>;
  links: Record<NFTMetadataProviders, string>;
};

export type NFTWithMetadata = NFT & {
  // Nft name (from metadata)
  nftName: string | null;
  // url
  picture: string | null;
  /** @warning we don't know if it's going to be the nft description or collection description */
  description: string | null;
  // Array of properties (as trait name are not unique so it can't be a simple Object)
  // based on the OpenSea standard: https://docs.opensea.io/docs/metadata-standards
  properties: Array<Record<string, string>> | null;
  collection: Pick<NFT, "collection"> & {
    // Name of the collection
    tokenName: string | null;
  };
};
