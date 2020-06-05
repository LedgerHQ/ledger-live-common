// @flow
/* eslint-disable no-console */
import winston from "winston";
import { setEnvUnsafe } from "@ledgerhq/live-common/lib/env";
import { implementCountervalues } from "@ledgerhq/live-common/lib/countervalues";
import { listen } from "@ledgerhq/logs";
import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";
import "@ledgerhq/live-common/lib/load/tokens/ethereum/erc20";
import "@ledgerhq/live-common/lib/load/tokens/tron/trc10";
import "@ledgerhq/live-common/lib/load/tokens/tron/trc20";
import { setSupportedCurrencies } from "@ledgerhq/live-common/lib/data/cryptocurrencies";

implementCountervalues({
  getAPIBaseURL: () => window.LEDGER_CV_API,
  storeSelector: (state) => state.countervalues,
  pairsSelector: () => [],
  setExchangePairsAction: () => {},
});

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
]);

for (const k in process.env) setEnvUnsafe(k, process.env[k]);

const { VERBOSE, VERBOSE_FILE } = process.env;

const logger = winston.createLogger({
  level: "debug",
  transports: [],
});

const { format } = winston;
const { combine, json } = format;
const winstonFormatJSON = json();
const winstonFormatConsole = combine(
  // eslint-disable-next-line no-unused-vars
  format(({ type, id, date, ...rest }) => rest)(),
  format.colorize(),
  format.simple()
);

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const level = VERBOSE && VERBOSE in levels ? VERBOSE : "debug";

if (VERBOSE_FILE) {
  logger.add(
    new winston.transports.File({
      format: winstonFormatJSON,
      filename: VERBOSE_FILE,
      level,
    })
  );
}

if (VERBOSE && VERBOSE !== "json") {
  logger.add(
    new winston.transports.Console({
      format: winstonFormatConsole,
      colorize: true,
      level,
    })
  );
} else {
  logger.add(
    new winston.transports.Console({
      format: winstonFormatJSON,
      silent: !VERBOSE,
      level,
    })
  );
}

listen((log) => {
  const { type } = log;
  let level = "info";
  if (type === "libcore-call" || type === "libcore-result") {
    level = "silly";
  } else if (
    type === "apdu" ||
    type === "hw" ||
    type === "speculos" ||
    type.includes("debug") ||
    type.startsWith("libcore")
  ) {
    level = "debug";
  } else if (type.includes("warn")) {
    level = "warn";
  } else if (type.startsWith("network") || type.startsWith("socket")) {
    level = "http";
  } else if (type.includes("error")) {
    level = "error";
  }
  logger.log(level, log);
});

implementLibcore({
  lib: () => require("@ledgerhq/ledger-core"), // eslint-disable-line global-require
  dbPath: process.env.LIBCORE_DB_PATH || "./dbdata",
});
