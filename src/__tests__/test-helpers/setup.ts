import BigNumber from "bignumber.js";
import { setSupportedCurrencies } from "../../currencies";
import { setPlatformVersion } from "../../platform/version";
import winston from "winston";
import { listen } from "@ledgerhq/logs";
import { EnvName, setEnvUnsafe } from "../../env";

jest.setTimeout(180000);

expect.extend({
  toBeBigNumber(value) {
    const pass = BigNumber.isBigNumber(value);
    const message = pass
      ? () => `${value} is a BigNumber`
      : () => `${value} is not a BigNumber`;

    return { message, pass };
  },
});

setPlatformVersion("0.0.1");

setSupportedCurrencies([
  "bitcoin",
  "ethereum",
  "bsc",
  "elrond",
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
  "tron",
  "stellar",
  "cosmos",
  "algorand",
  "polkadot",
  "bitcoin_testnet",
  "ethereum_ropsten",
  "cosmos_testnet",
  "crypto_org_croeseid",
  "crypto_org",
  "filecoin",
]);

for (const k in process.env) setEnvUnsafe(k as EnvName, process.env[k]);

const { VERBOSE, VERBOSE_FILE } = process.env;
const logger = winston.createLogger({
  level: "debug",
  transports: [],
});
const { format } = winston;
const { combine, timestamp, json } = format;
const winstonFormat = combine(timestamp(), json());

if (VERBOSE_FILE) {
  logger.add(
    new winston.transports.File({
      format: winstonFormat,
      filename: VERBOSE_FILE,
      level: "debug",
    })
  );
}

logger.add(
  new winston.transports.Console({
    format: winstonFormat,
    silent: !VERBOSE,
  })
);
// eslint-disable-next-line no-unused-vars
listen(({ type, message, ...rest }) => {
  logger.log("debug", {
    message: type + (message ? ": " + message : ""),
    // $FlowFixMe
    ...rest,
  });
});
