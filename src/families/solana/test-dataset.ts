import BigNumber from "bignumber.js";
import type { DatasetTest } from "../../types";

import { Transaction } from "./types";

import scanAccounts1 from "./datasets/solana.scanAccounts.1";
import {
  AmountRequired,
  FeeNotLoaded,
  FeeTooHigh,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
} from "@ledgerhq/errors";
import {
  SolanaAccountNotFound,
  SolanaAddressOffEd25519,
  SolanaMemoIsTooLong,
} from "./errors";
import { MAX_MEMO_LENGTH } from "./logic";

// do not change real properties or the test will break
const testOnChainData = {
  // real props
  senderAddress: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs12",
  nonExistingAddress: "4nFjHzLkZ2uYCvutUitvjfxuWStHt7bPoW65TQbFohX6",
  offEd25519Address: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs14",
  offEd25519Address2: "12rqwuEgBYiGhBrDJStCiqEtzQpTTiZbh7teNVLuYcFA",
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
            {
              name: "status is error: account not found without allowNotCreatedRecipient",
              transaction: {
                amount: new BigNumber(1),
                recipient: testOnChainData.nonExistingAddress,
                fees: new BigNumber(10),
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new SolanaAccountNotFound(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is warning: account not found with allowNotCreatedRecipient",
              transaction: {
                amount: new BigNumber(1),
                recipient: testOnChainData.nonExistingAddress,
                allowNotCreatedRecipient: true,
                fees: new BigNumber(10),
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {
                  recipient: new SolanaAccountNotFound(),
                },
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: recipient is not valid base58 address",
              transaction: {
                amount: new BigNumber(1),
                recipient: "0",
                fees: new BigNumber(10),
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddress(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: recipient address is off ed25519",
              transaction: {
                amount: new BigNumber(1),
                recipient: testOnChainData.offEd25519Address,
                fees: new BigNumber(10),
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new SolanaAddressOffEd25519(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: memo is too long",
              transaction: {
                amount: new BigNumber(1),
                recipient: testOnChainData.senderAddress,
                fees: new BigNumber(10),
                memo: Buffer.alloc(MAX_MEMO_LENGTH + 1).toString("hex"),
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  memo: new SolanaMemoIsTooLong(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            // TODO: add zero balance not funded check
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
