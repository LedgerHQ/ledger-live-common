import BigNumber from "bignumber.js";
import type { DatasetTest } from "../../types";

import { Transaction } from "./types";

import scanAccounts1 from "./datasets/solana.scanAccounts.1";
import {
  AmountRequired,
  FeeNotLoaded,
  FeeTooHigh,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
} from "@ledgerhq/errors";

// do not change real properties or the test will break
const testOnChainData = {
  // real props
  senderAddress: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs12",
  balance: new BigNumber(5000000),
  // maybe outdated or not real, fine for tests
  fees: new BigNumber(5000),
  recipientAddress: "7NmQKgPPDM6EjZSLbSVRXDd6UvPN7azaXF5YJNUJpqG9",
};

const zero = new BigNumber(0);

// Some general tests like empty/invalid recipient are automatically run, no need to write them.
const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    solana: {
      scanAccounts: [scanAccounts1],
      accounts: [
        {
          raw: makeAccount(testOnChainData.senderAddress),
          FIXME_tests: ["balance is sum of ops"],
          transactions: [
            {
              name: "status is success: not all amount",
              transaction: {
                amount: testOnChainData.balance.dividedBy(2),
                recipient: testOnChainData.recipientAddress,
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
            {
              name: "status is success: all amount",
              transaction: {
                useAllAmount: true,
                amount: zero,
                recipient: testOnChainData.recipientAddress,
                fees: testOnChainData.fees,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: testOnChainData.fees,
                amount: testOnChainData.balance.minus(testOnChainData.fees),
                totalSpent: testOnChainData.balance,
              },
            },
            {
              name: "status is error: not enough balance, not all amount",
              transaction: {
                amount: testOnChainData.balance,
                recipient: testOnChainData.recipientAddress,
                fees: testOnChainData.fees,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: not enough balance, all amount",
              transaction: {
                useAllAmount: true,
                amount: zero,
                recipient: testOnChainData.recipientAddress,
                fees: testOnChainData.balance,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: amount is 0",
              transaction: {
                amount: zero,
                recipient: testOnChainData.recipientAddress,
                fees: testOnChainData.balance,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: amount is negative",
              transaction: {
                amount: new BigNumber(-1),
                recipient: testOnChainData.recipientAddress,
                fees: testOnChainData.balance,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: source == destination",
              transaction: {
                amount: testOnChainData.balance,
                recipient: testOnChainData.senderAddress,
                fees: testOnChainData.fees,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            // if fees is undefined then prepareTransaction will load fees
            {
              name: "status is error: negative fee",
              transaction: {
                amount: testOnChainData.balance,
                recipient: testOnChainData.recipientAddress,
                fees: new BigNumber(-1),
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  fees: new FeeNotLoaded(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: fee is too high",
              transaction: {
                amount: new BigNumber(1),
                recipient: testOnChainData.recipientAddress,
                fees: new BigNumber(10),
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  fees: new FeeTooHigh(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            // TODO: check recipient exists ?
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
