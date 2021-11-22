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
  RecipientRequired,
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
  // 44'/501'/0/0
  fundedSenderAddress: "7CZgkK494jMdoY8xpXY3ViLjpDGMbNikCzMtAT5cAjKk",
  fundedSenderBalance: new BigNumber(98985000),
  // 44'/501'/1000/0
  fundedAddress: "ARRKL4FT4LMwpkhUw4xNbfiHqR7UdePtzGLvkszgydqZ",
  // maybe outdated or not real, fine for tests
  offEd25519Address: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs14",
  offEd25519Address2: "12rqwuEgBYiGhBrDJStCiqEtzQpTTiZbh7teNVLuYcFA",
  feeCalculator: {
    lamportsPerSignature: 5000,
  },
};

const fees = (signatureCount: number) =>
  new BigNumber(
    signatureCount * testOnChainData.feeCalculator.lamportsPerSignature
  );

const zero = new BigNumber(0);

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    solana: {
      scanAccounts: [scanAccounts1],
      accounts: [
        {
          raw: makeAccount(testOnChainData.fundedSenderAddress),
          /*
          Solana integration is written in such a way that requires
          prepareTransaction to be called before any meaningfull status
          can be calculated. The general bridge tests do not run prepareTransaction
          on all tests, so skip them in the general runner, but make alternatives for them.
          */
          FIXME_tests: [
            "balance is sum of ops",
            "Default empty recipient have a recipientError",
            "invalid recipient have a recipientError",
            "can be called on an empty transaction",
          ],
          transactions: [
            {
              name: "status is error: recipient required",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: zero,
                recipient: "",
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new RecipientRequired(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: recipient is not valid",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: new BigNumber(1),
                recipient: "0",
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddress(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount: new BigNumber(1),
                totalSpent: zero,
              },
            },
            {
              name: "status is error: called on an empty transaction",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: zero,
                recipient: "",
                feeCalculator: undefined,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new RecipientRequired(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is success: not all amount",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: testOnChainData.fundedSenderBalance.dividedBy(2),
                recipient: testOnChainData.fundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: fees(1),
                amount: testOnChainData.fundedSenderBalance.dividedBy(2),
                totalSpent: testOnChainData.fundedSenderBalance
                  .dividedBy(2)
                  .plus(fees(1)),
              },
            },
            {
              name: "status is success: all amount",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                useAllAmount: true,
                amount: zero,
                recipient: testOnChainData.fundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: fees(1),
                amount: testOnChainData.fundedSenderBalance.minus(fees(1)),
                totalSpent: testOnChainData.fundedSenderBalance,
              },
            },
            {
              name: "status is error: not enough balance, not all amount",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: testOnChainData.fundedSenderBalance,
                recipient: testOnChainData.fundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount: testOnChainData.fundedSenderBalance,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: not enough balance, all amount",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                useAllAmount: true,
                amount: zero,
                recipient: testOnChainData.fundedAddress,
                feeCalculator: {
                  lamportsPerSignature: testOnChainData.fundedSenderBalance
                    .plus(1)
                    .toNumber(),
                },
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
                estimatedFees: testOnChainData.fundedSenderBalance.plus(1),
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: amount is 0",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: zero,
                recipient: testOnChainData.fundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount: zero,
                totalSpent: zero,
              },
            },
            {
              name: "status is error: amount is negative",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: new BigNumber(-1),
                recipient: testOnChainData.fundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount: new BigNumber(-1),
                totalSpent: zero,
              },
            },
            {
              name: "status is error: source == destination",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: testOnChainData.fundedSenderBalance,
                recipient: testOnChainData.fundedSenderAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount: testOnChainData.fundedSenderBalance,
                totalSpent: zero,
              },
            },
            {
              name: "status is warning: recipient wallet not funded",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: new BigNumber(1),
                recipient: testOnChainData.unfundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {
                  recipient: new SolanaAccountNotFunded(),
                },
                estimatedFees: fees(1),
                amount: new BigNumber(1),
                totalSpent: fees(1).plus(1),
              },
            },
            {
              name: "status is warning: recipient address is off ed25519",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {},
                },
                amount: new BigNumber(1),
                recipient: testOnChainData.offEd25519Address,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {
                  recipient: new SolanaAccountNotFunded(),
                  recipientOffCurve: new SolanaAddressOffEd25519(),
                },
                estimatedFees: fees(1),
                amount: new BigNumber(1),
                totalSpent: fees(1).plus(1),
              },
            },
            {
              name: "status is error: memo is too long",
              transaction: {
                model: {
                  kind: "transfer",
                  uiState: {
                    memo: Buffer.alloc(MAX_MEMO_LENGTH + 1).toString("hex"),
                  },
                },
                amount: new BigNumber(1),
                recipient: testOnChainData.fundedSenderAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  memo: new SolanaMemoIsTooLong(),
                },
                warnings: {},
                amount: new BigNumber(1),
                estimatedFees: fees(1),
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
