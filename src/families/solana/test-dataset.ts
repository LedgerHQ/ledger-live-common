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
  SolanaAccountNotFunded,
  SolanaAddressOffEd25519,
  SolanaMemoIsTooLong,
} from "./errors";
import { MAX_MEMO_LENGTH } from "./logic";

// do not change real properties or the test will break
const testOnChainData = {
  // real props
  // seed
  unfundedAddress: "7b6Q3ap8qRzfyvDw1Qce3fUV8C7WgFNzJQwYNTJm3KQo",
  // m'/501'/0/0
  fundedSenderAddress: "7CZgkK494jMdoY8xpXY3ViLjpDGMbNikCzMtAT5cAjKk",
  fundedSenderBalance: new BigNumber(98985000),
  // m'/501'/1000/0
  fundedAddress: "ARRKL4FT4LMwpkhUw4xNbfiHqR7UdePtzGLvkszgydqZ",
  // maybe outdated or not real, fine for tests
  offEd25519Address: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs14",
  offEd25519Address2: "12rqwuEgBYiGhBrDJStCiqEtzQpTTiZbh7teNVLuYcFA",
  fees: new BigNumber(5000),
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
          raw: makeAccount(testOnChainData.fundedSenderAddress),
          FIXME_tests: ["balance is sum of ops"],
          transactions: [
            {
              name: "status is success: not all amount",
              transaction: {
                amount: testOnChainData.fundedSenderBalance.dividedBy(2),
                recipient: testOnChainData.fundedAddress,
                fees: testOnChainData.fees,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: new BigNumber(testOnChainData.fees),
                amount: testOnChainData.fundedSenderBalance.dividedBy(2),
                totalSpent: testOnChainData.fundedSenderBalance
                  .dividedBy(2)
                  .plus(testOnChainData.fees),
              },
            },
            {
              name: "status is success: all amount",
              transaction: {
                useAllAmount: true,
                amount: zero,
                recipient: testOnChainData.fundedAddress,
                fees: testOnChainData.fees,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: testOnChainData.fees,
                amount: testOnChainData.fundedSenderBalance.minus(
                  testOnChainData.fees
                ),
                totalSpent: testOnChainData.fundedSenderBalance,
              },
            },
            {
              name: "status is error: not enough balance, not all amount",
              transaction: {
                amount: testOnChainData.fundedSenderBalance,
                recipient: testOnChainData.fundedAddress,
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
                recipient: testOnChainData.fundedAddress,
                fees: testOnChainData.fundedSenderBalance,
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
                recipient: testOnChainData.fundedAddress,
                fees: testOnChainData.fundedSenderBalance,
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
                recipient: testOnChainData.fundedAddress,
                fees: testOnChainData.fundedSenderBalance,
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
                amount: testOnChainData.fundedSenderBalance,
                recipient: testOnChainData.fundedSenderAddress,
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
                amount: testOnChainData.fundedSenderBalance,
                recipient: testOnChainData.fundedAddress,
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
                recipient: testOnChainData.fundedAddress,
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
              name: "status is error: account not funded without allowNotFundedRecipient",
              transaction: {
                amount: new BigNumber(1),
                recipient: testOnChainData.unfundedAddress,
                fees: new BigNumber(10),
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new SolanaAccountNotFunded(),
                },
                warnings: {},
                estimatedFees: zero,
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is warning: account not funded with allowNotFundedRecipient",
              transaction: {
                amount: new BigNumber(1),
                recipient: testOnChainData.unfundedAddress,
                allowUnFundedRecipient: true,
                fees: new BigNumber(10),
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {
                  recipient: new SolanaAccountNotFunded(),
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
                recipient: testOnChainData.fundedSenderAddress,
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
