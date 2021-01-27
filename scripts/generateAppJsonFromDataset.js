// @flow
/* eslint-disable no-console */
const { reduce, filter, map } = require("rxjs/operators");
const {
  mockDeviceWithAPDUs,
  releaseMockDevice,
} = require("../lib/__tests__/test-helpers/mockDevice");
const { getCurrencyBridge } = require("../lib/bridge");
const { implicitMigration } = require("../lib/migrations/accounts");
const implementLibcore = require("../lib/libcore/platforms/nodejs").default;
const {
  getCryptoCurrencyById,
  setSupportedCurrencies,
} = require("../lib/currencies");
const datasets = require("../lib/generated/test-dataset").default;

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

implementLibcore({
  lib: () => require("@ledgerhq/ledger-core"),
  dbPath: "./dbdata",
});

const defaultSyncConfig = {
  paginationConfig: {},
  blacklistedTokenIds: ["ethereum/erc20/ampleforth"],
};

const extraCurrenciesData = () => {
  const data = [];

  Object.keys(datasets).forEach((key) => {
    const { currencies } = datasets[key];
    Object.keys(currencies).forEach((k) => {
      const currency = currencies[k];
      currency.scanAccounts.forEach((sa) =>
        data.push({ currencyName: k, apdus: sa.apdus })
      );
    });
  });

  return data;
};

const syncAccount = async (data) => {
  const currency = getCryptoCurrencyById(data.currencyName);
  const bridge = getCurrencyBridge(currency);
  const deviceId = mockDeviceWithAPDUs(data.apdus);
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
  // 1. from data sets extract apdus
  // 2. import accounts
  const data = extraCurrenciesData();
  const accountsPromise = Promise.all(data.map((d) => syncAccount(d)));
  const accounts = await accountsPromise();
  console.log(accounts);
  // 3. make a sync of each accounts in //
  // 4. combine into one app.json
}

main();
