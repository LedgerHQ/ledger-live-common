import type BigNumber from "bignumber.js";

export type NFT = {
  // id crafted by live
  id: string;
  // id on chain
  tokenId: string;
  // Nft name (from metadata)
  nftName: string | null;
  // url
  picture: string | null;
  /** @warning we don't know if it's going to be the nft description or collection description */
  description: string | null;
  // Array of properties (as trait name are not unique so it can't be a simple Object)
  // based on the OpenSea standard: https://docs.opensea.io/docs/metadata-standards
  properties: Array<Record<string, string>> | null;
  // ERC1155 allow for semi-fungible tokens, so same token ID, but with multiple occurences
  // (you can see each token with a possible supply)
  amount: BigNumber;
  collection: {
    contract: string;
    // Name of the collection
    tokenName: string | null;
    // Carefull to non spec compliant NFTs (cryptopunks, cryptokitties, ethrock, and others?)
    standard: "ERC721" | "ERC1155" | "NonStandard";
  };
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
