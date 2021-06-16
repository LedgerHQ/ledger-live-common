const manifest = [
  {
    id: "paraswap",
    name: "ParaSwap",
    url:
      "https://ledger-live-platform-apps.vercel.app/app/dapp-browser?url=https%3A%2F%2Fparaswap.io%2F%3Fembed%3Dtrue%26referrer%3Dledger1&nanoApp=Paraswap&dappName=paraswap",
    homepageUrl: "https://paraswap.io",
    supportUrl: "https://paraswap.io",
    icon: null,
    platform: "all",
    apiVersion: "^0.0.0",
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
    domains: ["https://*.paraswap.io"],
  },
  {
    id: "wyre_buy",
    name: "Wyre",
    url: "https://ledger-live-platform-apps.vercel.app/app/wyre",
    homepageUrl: "https://www.sendwyre.com/",
    icon: null,
    platform: "all",
    apiVersion: "^0.0.0",
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
    domains: ["https://*.sendwyre.com/"],
  },
  {
    id: "debug",
    name: "Debugger",
    url: "https://ledger-live-platform-apps.vercel.app/app/debug",
    homepageUrl: "https://developers.ledger.com/",
    icon: null,
    platform: "all",
    apiVersion: "^0.0.0",
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
    domains: ["https://ledger-live-platform-apps.vercel.app/"],
  },
];

export default manifest;
