/* eslint-disable no-console */
import { setSupportedCurrencies } from "../../data/cryptocurrencies";

import "../../load/tokens/ethereum/erc20";
import "../../load/tokens/tron/trc10";
import "../../load/tokens/tron/trc20";
import "../../load/tokens/algorand/asa";

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
]);
