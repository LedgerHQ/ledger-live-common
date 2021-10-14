import BigNumber from "bignumber.js";
import type { DatasetTest } from "../../types";

import { Transaction } from "./types";

import scanAccounts1 from "./datasets/solana.scanAccounts.1";

const testOnChainData = {
  accAddress: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs12", // real address
  balance: new BigNumber(5000000), // real balance
  fees: new BigNumber(5000), // may be outdated fee. fine for tests
};

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    solana: {
      scanAccounts: [scanAccounts1],
      accounts: [
        {
          raw: makeAccount(testOnChainData.accAddress),
          FIXME_tests: ["balance is sum of ops"],
          transactions: [
            {
              name: "status is success",
              transaction: {
                amount: testOnChainData.balance.dividedBy(2),
                recipient: "7NmQKgPPDM6EjZSLbSVRXDd6UvPN7azaXF5YJNUJpqG9",
                fees: testOnChainData.fees,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: new BigNumber(testOnChainData.fees),
                amount: testOnChainData.balance.dividedBy(2),
                totalSpent: testOnChainData.balance
                  .dividedBy(2)
                  .plus(testOnChainData.fees),
              },
            },
            /*
            {
              name: "status is error: source == destination",
              transaction: fromTransactionRaw({
                amount: "10000000",
                recipient: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs12",
                fees: "5000",
                family: "solana",
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: new BigNumber("5000"),
                amount: new BigNumber("10000000"),
                totalSpent: new BigNumber("10005000"),
              },
            },
            */
          ],
        },
      ],
    },
  },
};

export default dataset;

function makeAccount(freshAddress: string) {
  return {
    id: `js:2:solana:${freshAddress}:`,
    seedIdentifier: "",
    name: "Solana 1",
    derivationMode: "" as const,
    index: 0,
    freshAddress,
    freshAddressPath: "",
    freshAddresses: [],
    blockHeight: 0,
    operations: [],
    pendingOperations: [],
    currencyId: "solana",
    unitMagnitude: 9,
    lastSyncDate: "",
    balance: "0",
  };
}
