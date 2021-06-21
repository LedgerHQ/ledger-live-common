// @flow
import type { AppManifest } from "./types";

const manifest: AppManifest[] = [
  {
    id: "paraswap",
    name: "ParaSwap",
    url:
      "https://ledger-live-platform-apps.vercel.app/app/dapp-browser?url=https%3A%2F%2Fparaswap.io%2F%3Fembed%3Dtrue%26referrer%3Dledger1&nanoApp=Paraswap&dappName=paraswap",
    homepageUrl: "https://paraswap.io",
    supportUrl: "https://paraswap.io",
    icon: "https://cdn.live.ledger.com/icons/platform/paraswap.png",
    platform: "all",
    apiVersion: "0.0.1",
    branch: "stable",
    params: ["accountId"],
    categories: ["swap", "defi"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en:
          "Swap your crypto with ParaSwap that aggregates and provides the best quotes decentralised exchanges.",
      },
      description: {
        en:
          "Swap your crypto with ParaSwap that aggregates and provides the best quotes decentralised exchanges.",
      },
    },
    permissions: [
      {
        method: "account.list",
        params: {
          currencies: ["ethereum"],
        },
      },
      {
        method: "account.request",
        params: {
          currencies: ["ethereum"],
        },
      },
      {
        method: "transaction.sign",
        params: {
          nanoApp: ["paraswap"],
        },
      },
      {
        method: "transaction.broadcast",
      },
    ],
    domains: ["https://*"],
  },
  {
    id: "wyre_buy",
    name: "Wyre",
    url: "https://ledger-live-platform-apps.vercel.app/app/wyre",
    homepageUrl: "https://www.sendwyre.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/wyre.png",
    platform: "all",
    apiVersion: "0.0.1",
    branch: "stable",
    categories: ["exchange", "buy"],
    currencies: ["ethereum", "bitcoin"],
    content: {
      shortDescription: {
        en:
          "Purchase Bitcoin, Ethereum and more crypto with Wyre, only available to our US customers.",
      },
      description: {
        en:
          "Purchase Bitcoin, Ethereum and more crypto with Wyre, only available to our US customers.",
      },
    },
    permissions: [
      {
        method: "account.request",
        params: {
          currencies: ["ethereum", "bitcoin"],
        },
      },
    ],
    domains: ["https://*"],
  },
  {
    id: "aave",
    name: "Aave",
    url: "",
    homepageUrl: "https://aave.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/aave.png",
    platform: "all",
    apiVersion: "0.0.1",
    branch: "soon",
    categories: ["lend"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en:
          "Lend or Borrow your crypto through a liquidity market protocol and stay in control of your funds.",
      },
      description: {
        en:
          "Lend or Borrow your crypto through a liquidity market protocol and stay in control of your funds.",
      },
    },
    permissions: [],
    domains: [],
  },
  {
    id: "compound",
    name: "Compound",
    url: "",
    homepageUrl: "https://compound.finance/",
    icon: "https://cdn.live.ledger.com/icons/platform/compound.png",
    platform: "all",
    apiVersion: "0.0.1",
    branch: "soon",
    categories: ["lend", "compound"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en:
          "Lend or Borrow your crypto via a completely decentralized and open-source protocol.",
      },
      description: {
        en:
          "Lend or Borrow your crypto via a completely decentralized and open-source protocol.",
      },
    },
    permissions: [],
    domains: [],
  },
  {
    id: "rainbow",
    name: "Rainbow.me",
    url: "",
    homepageUrl: "https://rainbow.me",
    icon: "https://cdn.live.ledger.com/icons/platform/rainbow.png",
    platform: "all",
    apiVersion: "0.0.1",
    branch: "soon",
    categories: ["nft"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "An easy way to visualize the NFT secured by your hardware wallet.",
      },
      description: {
        en: "An easy way to visualize the NFT secured by your hardware wallet.",
      },
    },
    permissions: [],
    domains: [],
  },
  {
    id: "dappradar",
    name: "DappRadar",
    url: "",
    homepageUrl: "https://dappradar.com",
    icon: "https://cdn.live.ledger.com/icons/platform/dappradar.png",
    platform: "all",
    apiVersion: "0.0.1",
    branch: "soon",
    categories: ["wallet", "dapp", "nft"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en:
          "An Ethereum portfolio allowing you to check your Ether, tokens, and NFTs.",
      },
      description: {
        en:
          "An Ethereum portfolio allowing you to check your Ether, tokens, and NFTs.",
      },
    },
    permissions: [],
    domains: [],
  },
  {
    id: "debug",
    name: "Debugger",
    url: "https://ledger-live-platform-apps.vercel.app/app/debug",
    homepageUrl: "https://developers.ledger.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/debugger.png",
    platform: "all",
    apiVersion: "0.0.1",
    branch: "debug",
    categories: ["tools"],
    currencies: "*",
    content: {
      shortDescription: {
        en:
          "Try out the Ledger Live API to test capabilities of our platform integration solution. Use at your own risk.",
      },
      description: {
        en:
          "Try out the Ledger Live API to test capabilities of our platform integration solution. Use at your own risk.",
      },
    },
    permissions: [
      {
        method: "*",
      },
    ],
    domains: ["https://*"],
  },
];

export default manifest;
