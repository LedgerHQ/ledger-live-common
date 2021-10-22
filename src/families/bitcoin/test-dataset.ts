import type { DatasetTest } from "../../types";
import type { Transaction } from "./types";
import bitcoin_cash from "./datasets/bitcoin_cash";
import bitcoin_gold from "./datasets/bitcoin_gold";
import bitcoin from "./datasets/bitcoin";
import dash from "./datasets/dash";
// import decred from "./datasets/decred";
import digibyte from "./datasets/digibyte";
import dogecoin from "./datasets/dogecoin";
// import zencash from "./datasets/zencash";
import komodo from "./datasets/komodo";
import litecoin from "./datasets/litecoin";
import peercoin from "./datasets/peercoin";
import pivx from "./datasets/pivx";
import qtum from "./datasets/qtum";
// import stakenet from "./datasets/stakenet";
import vertcoin from "./datasets/vertcoin";
import viacoin from "./datasets/viacoin";
// import zcash from "./datasets/zcash";
const dataset: DatasetTest<Transaction> = {
  implementations: ["js", "libcore", "mock"],
  currencies: {
    bitcoin,
    bitcoin_cash,
    bitcoin_gold,
    dash,
    // decred, // BACK-2443
    digibyte,
    dogecoin,
    // zencash,
    komodo,
    litecoin,
    peercoin,
    pivx,
    qtum,
    // stakenet,
    vertcoin,
    viacoin,
    // zcash,
  },
};
export default dataset;
