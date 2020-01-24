// @flow
import type { DatasetTest } from "../../__tests__/test-helpers/bridge";
import type { Transaction } from "./types";

import ethereum from "./datasets/ethereum";
import ethereum_classic from "./datasets/ethereum_classic";

const dataset: DatasetTest<Transaction> = {
  implementations: ["libcore", "mock"],
  currencies: {
    ethereum,
    ethereum_classic
  }
};

export default dataset;
