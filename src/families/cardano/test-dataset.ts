import type { DatasetTest } from "../../types";
import { cardanoRawAccount1 } from "./datasets/rawAccount.1";
import { cardanoScanAccount1 } from "./datasets/scanAccount.1";
import type { Transaction } from "./types";

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    cardano: {
      scanAccounts: [cardanoScanAccount1],
      accounts: [
        {
          raw: cardanoRawAccount1,
          transactions: [
            // Invalid address test
            // Minimum UTXO value test
          ],
        },
      ],
    },
  },
};

export default dataset;
