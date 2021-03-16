// @flow
/* eslint-disable no-console */
import invariant from "invariant";
import { reduce, filter, map } from "rxjs/operators";
import { getCurrencyBridge } from "@ledgerhq/live-common/lib/bridge";
import { implicitMigration } from "@ledgerhq/live-common/lib/migrations/accounts";
import {
  getCryptoCurrencyById,
  setSupportedCurrencies,
} from "@ledgerhq/live-common/lib/currencies";
import datasets from "@ledgerhq/live-common/lib/generated/test-dataset";
import { mockDeviceWithAPDUs, releaseMockDevice } from "../live-common-setup";

setSupportedCurrencies([
  "bitcoin",
  "ethereum",
  "ripple",
  "bitcoin_cash",
  "litecoin",
  "dash",
  "ethereum_classic",
  "tezos",
  "qtum",
  "zcash",
  "bitcoin_gold",
  "stratis",
  "dogecoin",
  "digibyte",
  "komodo",
  "pivx",
  "zencash",
  "vertcoin",
  "peercoin",
  "viacoin",
  "stakenet",
  "stealthcoin",
  "decred",
  "bitcoin_testnet",
  "ethereum_ropsten",
  "tron",
  "stellar",
  "cosmos",
  "algorand",
  "polkadot",
]);

const defaultSyncConfig = {
  paginationConfig: {},
  blacklistedTokenIds: ["ethereum/erc20/ampleforth"],
};

const excluded = [
  "algorand",
  "bitcoin",
  "bitcoin_cash",
  "bitcoin_gold",
  "cosmos",
  "dash",
  "decred",
  "digibyte",
  "dogecoin",
  "ethereum_classic",
  "komodo",
  "litecoin",
  "peercoin",
  "pivx",
  "polkadot",
  "qtum",
  "ripple",
  "stakenet",
  "stellar",
  "stealthcoin",
  "viacoin",
  "vertcoin",
  "zcash",
  "zencash",
];

const appJsonTemplate = {
  data: {
    SPECTRON_RUN: {
      localStorage: {
        acceptedTermsVersion: "2019-12-04",
      },
    },
    settings: {
      hasCompletedOnboarding: true,
      counterValue: "USD",
      language: "en",
      theme: "light",
      region: null,
      orderAccounts: "balance|desc",
      countervalueFirst: false,
      autoLockTimeout: 10,
      selectedTimeRange: "month",
      marketIndicator: "western",
      currenciesSettings: {},
      pairExchanges: {},
      developerMode: false,
      loaded: true,
      shareAnalytics: true,
      sentryLogs: true,
      lastUsedVersion: "99.99.99",
      dismissedBanners: [],
      accountsViewMode: "list",
      showAccountsHelperBanner: true,
      hideEmptyTokenAccounts: false,
      sidebarCollapsed: false,
      discreetMode: false,
      preferredDeviceModel: "nanoS",
      hasInstalledApps: true,
      carouselVisibility: 99999999999,
      hasAcceptedSwapKYC: false,
      lastSeenDevice: null,
      blacklistedTokenIds: [],
      swapAcceptedProviderIds: [],
      deepLinkUrl: null,
      firstTimeLend: false,
      swapProviders: [],
      showClearCacheBanner: false,
      starredAccountIds: [],
      hasPassword: false,
    },
    user: {
      id: "08cf3393-c5eb-4ea7-92de-0deea22e3971",
    },
    countervalues: {},
    accounts: [],
  },
};

const extraCurrenciesData = () => {
  const data = [];

  Object.keys(datasets).forEach((key) => {
    const { currencies } = datasets[key];
    Object.keys(currencies).forEach((k) => {
      // TODO: Check why these are not working
      if (excluded.includes(k)) {
        return;
      }
      const currency = currencies[k];
      if (!currency.scanAccounts?.length) return;
      currency.scanAccounts?.forEach((sa) => {
        data.push({ currencyName: k, apdus: sa.apdus });
      });
    });
  });

  return data;
};

const syncAccount = async (data) => {
  const currency = getCryptoCurrencyById(data.currencyName);
  const bridge = getCurrencyBridge(currency);
  const deviceId = mockDeviceWithAPDUs(data.apdus);
  invariant(currency, `could not find currency for ${data.currencyName}`);
  try {
    const accounts = await bridge
      .scanAccounts({
        currency,
        deviceId,
        syncConfig: defaultSyncConfig,
      })
      .pipe(
        filter((e) => e.type === "discovered"),
        map((e) => e.account),
        reduce((all, a) => all.concat(a), [])
      )
      .toPromise();
    return implicitMigration(accounts);
  } finally {
    releaseMockDevice(deviceId);
  }
};

async function main() {
  const data = extraCurrenciesData();
  const accounts = await Promise.all(data.flatMap((d) => syncAccount(d)));
  const flatten = accounts.flat();
  appJsonTemplate.data.accounts = flatten;
  console.log(JSON.stringify(appJsonTemplate));
}

export default {
  description:
    "Extract accounts from test datasets and print a sample app.json usable for tests",
  args: [],
  job: () => main(),
};
