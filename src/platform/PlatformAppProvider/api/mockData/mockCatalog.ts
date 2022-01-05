import type { CatalogMetadata } from "../../../types";

export const catalog: CatalogMetadata = {
  compatibleAppsManifestVersions: ["v1"],
  promotedApps: [
    {
      id: "moonpay",
      thumbnailUrl: "",
    },
    {
      id: "lido",
      thumbnailUrl: "",
    },
    {
      id: "paraswap",
      thumbnailUrl: "",
    },
  ],
  appsMetadata: [
    {
      id: "Card",
      category: "card",
      supercategory: "spend",
    },
    {
      id: "cl-card",
      category: "card",
      supercategory: "spend",
    },
    {
      id: "moonpay",
      category: "buy",
      supercategory: "trade",
    },
    {
      id: "ramp",
      category: "buy",
      supercategory: "trade",
    },
    {
      id: "paraswap",
      networks: ["ethereum", "bsc", "polygon"],
      category: "swap",
      supercategory: "trade",
    },
    {
      id: "lido",
      networks: ["ethereum"],
      category: "staking",
      supercategory: "earn",
    },
    {
      id: "1inch",
      networks: ["ethereum", "bsc", "polygon"],
      category: "swap",
      supercategory: "trade",
    },
    {
      id: "btcdirect",
      category: "buy",
      supercategory: "trade",
    },
    {
      id: "banxa",
      category: "buy",
      supercategory: "trade",
    },
    {
      id: "bitrefill",
      category: "gift",
      supercategory: "spend",
    },
    {
      id: "wyre_buy",
      category: "exchange",
      supercategory: "trade",
    },
    {
      id: "zerion",
      networks: ["ethereum"],
      category: "portfolio",
      supercategory: "services",
    },
    {
      id: "rainbow",
      category: "nft",
      supercategory: "nft",
    },
    {
      id: "poap",
      category: "nft",
      supercategory: "nft",
    },
    {
      id: "aave",
      category: "lend",
      supercategory: "earn",
    },
    {
      id: "compound",
      category: "lend",
      supercategory: "earn",
    },
    {
      id: "deversifi",
      category: "dex",
      supercategory: "trade",
    },
    {
      id: "yearn",
      networks: ["ethereum"],
      category: "staking",
      supercategory: "earn",
    },
    {
      id: "debug",
      category: "tools",
      supercategory: "services",
    },
  ],
};
