import type { AppManifest } from "../../types";
import type { PlatformApi } from "../types";

const manifest: AppManifest[] = [
  {
    id: "Card",
    name: "Card",
    url: "https://cl-cards.com/waiting-list/",
    homepageUrl: "https://baanx.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/card2.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["card"],
    currencies: "*",
    content: {
      shortDescription: {
        en: "Coming soon: spend your crypto globally with the crypto debit CL Card, powered by Ledger. Built to be compatible with your Ledger wallet. Join the waitlist",
      },
      description: {
        en: "Coming soon: spend your crypto globally with the crypto debit CL Card, powered by Ledger. Built to be compatible with your Ledger wallet. Join the waitlist",
      },
    },
    permissions: [
      {
        method: "*",
      },
    ],
    domains: ["https://*"],
  },
  {
    id: "cl-card",
    name: "Card",
    url: "https://cl-cards.com/waiting-list/",
    homepageUrl: "https://baanx.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/card2.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    private: true,
    branch: "stable",
    categories: ["card"],
    currencies: "*",
    content: {
      shortDescription: {
        en: "Coming soon: spend your crypto globally with the crypto debit CL Card, powered by Ledger. Built to be compatible with your Ledger wallet. Join the waitlist",
      },
      description: {
        en: "Coming soon: spend your crypto globally with the crypto debit CL Card, powered by Ledger. Built to be compatible with your Ledger wallet. Join the waitlist",
      },
    },
    permissions: [
      {
        method: "*",
      },
    ],
    domains: ["https://*"],
  },
  {
    id: "moonpay",
    name: "MoonPay",
    url: "https://buy.moonpay.com/?apiKey=pk_live_j5CLt1qxbqGtYhkxUxyk6VQnSd5CBXI&ledgerlive",
    homepageUrl: "https://www.moonpay.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/moonpay.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["buy"],
    currencies: [
      "bitcoin",
      "bitcoin_cash",
      "bsc",
      "digibyte",
      "dogecoin",
      "ethereum",
      "litecoin",
      "polkadot",
      "ripple",
      "stellar",
      "tron",
    ],
    content: {
      shortDescription: {
        en: "A fast, simple, and secure way to buy crypto.",
      },
      description: {
        en: "MoonPay accepts all major payment methods and over 30 fiat currencies, enabling people from all over the world to buy crypto.",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "ramp",
    name: "Ramp",
    url: "https://integrations.ramp.network/ledger/",
    homepageUrl: "https://ramp.network/buy",
    icon: "https://cdn.live.ledger.com/icons/platform/ramp.png",
    platform: "desktop",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["buy"],
    currencies: [
      "ethereum",
      "bitcoin",
      "bsc",
      "polkadot",
      "ripple",
      "litecoin",
      "polygon",
      "bitcoin_cash",
      "stellar",
      "dogecoin",
      "tezos",
      "elrond",
    ],
    content: {
      shortDescription: {
        en: "An easy, low-fee and secure way to buy your favorite crypto assets.",
      },
      description: {
        en: "Ramp - Use instant payment methods to buy crypto from anywhere on the globe.",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "paraswap",
    name: "ParaSwap",
    url: "https://dapp-browser.apps.ledger.com/?params=%7B%22dappUrl%22%3A%22https%3A%2F%2Fv4.paraswap.io%2F%3Fembed%3Dtrue%26referrer%3Dledger2%22%2C%22nanoApp%22%3A%22Paraswap%22%2C%22dappName%22%3A%22ParaSwap%22%2C%22networks%22%3A%5B%7B%22currency%22%3A%22ethereum%22%2C%22chainID%22%3A1%2C%22nodeURL%22%3A%22wss%3A%2F%2Feth-mainnet.ws.alchemyapi.io%2Fv2%2F0fyudoTG94QWC0tEtfJViM9v2ZXJuij2%22%7D%2C%7B%22currency%22%3A%22bsc%22%2C%22chainID%22%3A56%2C%22nodeURL%22%3A%22https%3A%2F%2Fbsc-dataseed.binance.org%2F%22%7D%2C%7B%22currency%22%3A%20%22polygon%22%2C%22chainID%22%3A%20137%2C%22nodeURL%22%3A%20%22https%3A%2F%2Fpolygon-mainnet.g.alchemy.com%2Fv2%2FoPIxZM7kXsPVVY1Sk0kOQwkoIOpSu8PE%22%7D%5D%7D",
    params: {
      dappUrl: "https://v4.paraswap.io/?embed=true&referrer=ledger2",
      nanoApp: "Paraswap",
      dappName: "ParaSwap",
      networks: [
        {
          currency: "ethereum",
          chainID: 1,
          nodeURL:
            "wss://eth-mainnet.ws.alchemyapi.io/v2/0fyudoTG94QWC0tEtfJViM9v2ZXJuij2",
        },
        {
          currency: "bsc",
          chainID: 56,
          nodeURL: "https://bsc-dataseed.binance.org/",
        },
        {
          currency: "polygon",
          chainID: 137,
          nodeURL:
            "https://polygon-mainnet.g.alchemy.com/v2/oPIxZM7kXsPVVY1Sk0kOQwkoIOpSu8PE",
        },
      ],
    },
    homepageUrl: "https://paraswap.io",
    supportUrl: "https://paraswap.io",
    icon: "https://cdn.live.ledger.com/icons/platform/paraswap.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["swap", "defi"],
    currencies: ["ethereum", "bsc"],
    content: {
      shortDescription: {
        en: "Swap your crypto with ParaSwap that aggregates and provides the best quotes decentralised exchanges.",
      },
      description: {
        en: "Swap your crypto with ParaSwap that aggregates and provides the best quotes decentralised exchanges.",
      },
    },
    permissions: [
      {
        method: "account.list",
        params: {
          currencies: ["ethereum", "bsc"],
        },
      },
      {
        method: "account.request",
        params: {
          currencies: ["ethereum", "bsc"],
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
    id: "lido",
    name: "Lido",
    url: "https://dapp-browser.apps.ledger.com/?params=%7B%22dappUrl%22%3A%22https%3A%2F%2Fstake.lido.fi%2F%3Fref%3D0x558247e365be655f9144e1a0140D793984372Ef3%26embed%3Dtrue%22%2C%22nanoApp%22%3A%22Lido%22%2C%22dappName%22%3A%22Lido%22%2C%22networks%22%3A%5B%7B%22currency%22%3A%22ethereum%22%2C%22chainID%22%3A1%2C%22nodeURL%22%3A%22wss%3A%2F%2Feth-mainnet.ws.alchemyapi.io%2Fv2%2F0fyudoTG94QWC0tEtfJViM9v2ZXJuij2%22%7D%5D%7D",
    params: {
      dappUrl:
        "https://stake.lido.fi/?ref=0x558247e365be655f9144e1a0140D793984372Ef3&embed=true",
      nanoApp: "Lido",
      dappName: "Lido",
      networks: [
        {
          currency: "ethereum",
          chainID: 1,
          nodeURL:
            "wss://eth-mainnet.ws.alchemyapi.io/v2/0fyudoTG94QWC0tEtfJViM9v2ZXJuij2",
        },
      ],
    },
    homepageUrl: "https://lido.fi/",
    icon: "https://cdn.live.ledger.com/icons/platform/lido.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["staking", "defi"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "Stake your ETH with Lido to earn daily staking rewards.",
      },
      description: {
        en: "Stake your ETH with Lido to earn daily staking rewards.",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "1inch",
    name: "1inch",
    url: "https://dapp-browser.apps.ledger.com/?params=%7B%22dappUrl%22%3A%22https%3A%2F%2Fapp.1inch.io%2F%3FledgerLive%3Dtrue%22%2C%22nanoApp%22%3A%221inch%22%2C%22dappName%22%3A%221inch%22%2C%22networks%22%3A%5B%7B%22currency%22%3A%22ethereum%22%2C%22chainID%22%3A1%2C%22nodeURL%22%3A%22wss%3A%2F%2Feth-mainnet.ws.alchemyapi.io%2Fv2%2F0fyudoTG94QWC0tEtfJViM9v2ZXJuij2%22%7D%2C%7B%22currency%22%3A%22bsc%22%2C%22chainID%22%3A56%2C%22nodeURL%22%3A%22https%3A%2F%2Fbsc-dataseed.binance.org%2F%22%7D%2C%7B%22currency%22%3A%20%22polygon%22%2C%22chainID%22%3A%20137%2C%22nodeURL%22%3A%20%22https%3A%2F%2Fpolygon-mainnet.g.alchemy.com%2Fv2%2FoPIxZM7kXsPVVY1Sk0kOQwkoIOpSu8PE%22%7D%5D%7D",
    params: {
      dappUrl: "https://app.1inch.io/?ledgerLive=true",
      nanoApp: "1inch",
      dappName: "1inch",
      networks: [
        {
          currency: "ethereum",
          chainID: 1,
          nodeURL:
            "wss://eth-mainnet.ws.alchemyapi.io/v2/0fyudoTG94QWC0tEtfJViM9v2ZXJuij2",
        },
        {
          currency: "bsc",
          chainID: 56,
          nodeURL: "https://bsc-dataseed.binance.org/",
        },
        {
          currency: "polygon",
          chainID: 137,
          nodeURL:
            "https://polygon-mainnet.g.alchemy.com/v2/oPIxZM7kXsPVVY1Sk0kOQwkoIOpSu8PE",
        },
      ],
    },
    homepageUrl: "https://1inch.io/",
    icon: "https://cdn.live.ledger.com/icons/platform/1inch.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["swap", "defi"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "Exchange crypto via a Defi/DEX aggregator on Ethereum mainnet, BSC or Polygon",
      },
      description: {
        en: "Exchange crypto via a Defi/DEX aggregator on Ethereum mainnet, BSC or Polygon",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "btcdirect",
    name: "BTC Direct",
    url: "https://ledger.btcdirect.eu/",
    homepageUrl: "https://btcdirect.eu/",
    icon: "https://cdn.live.ledger.com/icons/platform/btcdirect.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["buy"],
    currencies: ["bitcoin", "bitcoin_cash", "ethereum", "litecoin", "ripple"],
    content: {
      shortDescription: {
        en: "Buy crypto easily and quickly from your Ledger Live via BTC Direct.",
      },
      description: {
        en: "Buy crypto easily and quickly from your Ledger Live via BTC Direct.",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "banxa",
    name: "Banxa",
    url: "https://ledger.banxa.com/",
    homepageUrl: "https://banxa.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/banxa.png",
    platform: "desktop",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["buy"],
    currencies: ["ethereum", "bitcoin", "litecoin", "ripple", "tether"],
    content: {
      shortDescription: {
        en: "Banxa supports the widest choice of payment options locally and globally, enabling people to purchase crypto",
      },
      description: {
        en: "Banxa supports the widest choice of payment options locally and globally, enabling people to purchase crypto",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "bitrefill",
    name: "Bitrefill",
    url: "https://embed.bitrefill.com/buy/?utm_source=ledger_live&paymentMethods=bitcoin,ethereum,litecoin,dogecoin&ref=ftbYHzmt",
    homepageUrl: "https://bitrefill.com",
    icon: "https://cdn.live.ledger.com/icons/platform/bitrefill.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["gift cards"],
    currencies: ["bitcoin", "ethereum"],
    content: {
      shortDescription: {
        en: "Buy gift cards and top up airtime",
      },
      description: {
        en: "Buy gift cards and top up airtime with Bitcoin and Ethereum",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "wyre_buy",
    name: "Wyre",
    url: "https://platform.apps.ledger.com/app/wyre",
    homepageUrl: "https://www.sendwyre.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/wyre.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["exchange", "buy"],
    currencies: ["ethereum", "bitcoin", "algorand"],
    content: {
      shortDescription: {
        en: "Purchase Bitcoin, Ethereum and more crypto with Wyre, only available to our US customers.",
      },
      description: {
        en: "Purchase Bitcoin, Ethereum and more crypto with Wyre, only available to our US customers.",
      },
    },
    permissions: [
      {
        method: "account.request",
        params: {
          currencies: ["ethereum", "bitcoin", "algorand"],
        },
      },
    ],
    domains: ["https://*"],
  },
  {
    id: "zerion",
    name: "Zerion",
    url: "https://dapp-browser.apps.ledger.com/?params=%7B%22dappUrl%22%3A%22https%3A%2F%2Fapp.zerion.io%2F%3Fembed%3Dledgerdappbrowser%22%2C%22nanoApp%22%3A%22Paraswap%22%2C%22dappName%22%3A%22Zerion%22%2C%22networks%22%3A%5B%7B%22currency%22%3A%22ethereum%22%2C%22chainID%22%3A1%2C%22nodeURL%22%3A%22wss%3A%2F%2Feth-mainnet.ws.alchemyapi.io%2Fv2%2F0fyudoTG94QWC0tEtfJViM9v2ZXJuij2%22%7D%5D%7D",
    params: {
      dappUrl: "https://app.zerion.io/?embed=ledgerdappbrowser",
      nanoApp: "Paraswap",
      dappName: "Zerion",
      networks: [
        {
          currency: "ethereum",
          chainID: 1,
          nodeURL:
            "wss://eth-mainnet.ws.alchemyapi.io/v2/0fyudoTG94QWC0tEtfJViM9v2ZXJuij2",
        },
      ],
    },
    homepageUrl: "https://zerion.io/",
    icon: "https://cdn.live.ledger.com/icons/platform/zerion.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["portfolio", "defi"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "The smart way to manage your DeFi portfolio.",
      },
      description: {
        en: "The smart way to manage your DeFi portfolio.",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "rainbow",
    name: "Rainbow.me",
    url: "https://platform.apps.ledger.com/app/web-browser?url=https%3A%2F%2Frainbow.me%2F%7Baccount.address%7D&currencies=ethereum&webAppName=Rainbow.me",
    homepageUrl: "https://rainbow.me",
    icon: "https://cdn.live.ledger.com/icons/platform/rainbow.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
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
    domains: ["https://*"],
  },
  {
    id: "poap",
    name: "POAP",
    url: "https://platform.apps.ledger.com/app/web-browser?url=https%3A%2F%2Fapp.poap.xyz%2Fscan%2F%7Baccount.address%7D&currencies=ethereum&webAppName=Poap",
    homepageUrl: "https://app.poap.xyz/",
    icon: "https://cdn.live.ledger.com/icons/platform/poap.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "stable",
    categories: ["nft", "defi"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "Proof of Attendance Protocol",
      },
      description: {
        en: "The Proof of attendance protocol (POAP) reminds you of the cool places you’ve been to.",
      },
    },
    permissions: [],
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
    manifestVersion: "1",
    branch: "soon",
    categories: ["lend"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "Lend or Borrow your crypto through a liquidity market protocol and stay in control of your funds.",
      },
      description: {
        en: "Lend or Borrow your crypto through a liquidity market protocol and stay in control of your funds.",
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
    manifestVersion: "1",
    branch: "soon",
    categories: ["lend", "compound"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "Lend or Borrow your crypto via a completely decentralized and open-source protocol.",
      },
      description: {
        en: "Lend or Borrow your crypto via a completely decentralized and open-source protocol.",
      },
    },
    permissions: [],
    domains: [],
  },
  {
    id: "deversifi",
    name: "DeversiFi",
    url: "",
    homepageUrl: "https://www.deversifi.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/deversifi.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "soon",
    categories: ["dex"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "Trade through a self-custody decentralized exchange on Ethereum layer-2.",
      },
      description: {
        en: "Trade through a self-custody decentralized exchange on Ethereum layer-2.",
      },
    },
    permissions: [],
    domains: [],
  },
  {
    id: "yearn",
    name: "Yearn",
    url: "https://dapp-browser.apps.ledger.com",
    params: {
      dappUrl: "https://beta.yearn.finance?embed=true",
      nanoApp: "Yearn",
      dappName: "Yearn",
      networks: [
        {
          currency: "ethereum",
          chainID: 1,
          nodeURL:
            "wss://eth-mainnet.ws.alchemyapi.io/v2/0fyudoTG94QWC0tEtfJViM9v2ZXJuij2",
        },
      ],
    },
    homepageUrl: "https://beta.yearn.finance",
    icon: "https://cdn.live.ledger.com/icons/platform/yearn.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "experimental",
    categories: ["staking", "defi"],
    currencies: ["ethereum"],
    content: {
      shortDescription: {
        en: "Generate yield automatically with Yearn products",
      },
      description: {
        en: "Generate yield automatically with Yearn products",
      },
    },
    permissions: [],
    domains: ["https://*"],
  },
  {
    id: "debug",
    name: "Debugger",
    url: "https://ledger-live-platform-apps.vercel.app/app/debug",
    homepageUrl: "https://developers.ledger.com/",
    icon: "https://cdn.live.ledger.com/icons/platform/debugger.png",
    platform: "all",
    apiVersion: "0.0.1",
    manifestVersion: "1",
    branch: "debug",
    categories: ["tools"],
    currencies: "*",
    content: {
      shortDescription: {
        en: "Try out the Ledger Live API to test capabilities of our platform integration solution. Use at your own risk.",
      },
      description: {
        en: "Try out the Ledger Live API to test capabilities of our platform integration solution. Use at your own risk.",
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

async function fetchManifest(): Promise<AppManifest[]> {
  return Promise.resolve(manifest);
}

const api: PlatformApi = {
  fetchManifest,
};

export default api;
