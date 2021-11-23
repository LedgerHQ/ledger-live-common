import BigNumber from "bignumber.js";
import type { DatasetTest } from "../../types";

import { Transaction, TransactionModel } from "./types";

import scanAccounts1 from "./datasets/solana.scanAccounts.1";
import {
  AmountRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
  RecipientRequired,
} from "@ledgerhq/errors";
import {
  SolanaAccountNotFunded,
  SolanaAddressOffEd25519,
  SolanaMemoIsTooLong,
  SolanaRecipientAssociatedTokenAccountWillBeFunded,
  SolanaTokenAccountHoldsAnotherToken,
} from "./errors";
import {
  encodeAccountIdWithTokenAccountAddress,
  MAX_MEMO_LENGTH,
} from "./logic";
import createTransaction from "./js-createTransaction";
import { compact } from "lodash/fp";
import { assertUnreachable } from "./utils";

// do not change real properties or the test will break
const testOnChainData = {
  //  --- real props ---
  unfundedAddress: "7b6Q3ap8qRzfyvDw1Qce3fUV8C7WgFNzJQwYNTJm3KQo",
  // 0/0
  fundedSenderAddress: "7CZgkK494jMdoY8xpXY3ViLjpDGMbNikCzMtAT5cAjKk",
  fundedSenderBalance: new BigNumber(83404840),
  // 1000/0
  fundedAddress: "ARRKL4FT4LMwpkhUw4xNbfiHqR7UdePtzGLvkszgydqZ",
  wSolSenderAssocTokenAccAddress:
    "H6f17NUsg2XyB5KSbva61LjF3R16x45oUWPBRBdcL8BG",
  wSolSenderAssocTokenAccBalance: new BigNumber(7960720),
  // 1000/0
  wSolFundedAccountAssocTokenAccAddress:
    "Ax69sAxqBSdT3gMAUqXb8pUvgxSLCiXfTitMALEnFZTS",
  // 0/0
  notWSolTokenAccAddress: "Hsm3S2rhX4HwxYBaCyqgJ1cCtFyFSBu6HLy1bdvh7fKs",
  // ---  maybe outdated or not real, fine for tests ---
  offEd25519Address: "6D8GtWkKJgToM5UoiByHqjQCCC9Dq1Hh7iNmU4jKSs14",
  offEd25519Address2: "12rqwuEgBYiGhBrDJStCiqEtzQpTTiZbh7teNVLuYcFA",
  feeCalculator: {
    lamportsPerSignature: 5000,
  },
};

const mainAccId = `js:2:solana:${testOnChainData.fundedSenderAddress}:`;
const wSolSubAccId = encodeAccountIdWithTokenAccountAddress(
  mainAccId,
  testOnChainData.wSolSenderAssocTokenAccAddress
);

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
            ...recipientRequired(),
            ...recipientNotValid(),
            ...recipientIsSameAsSender(),
            ...memoIsTooLong(),
            {
              name: "status is error: called on an empty transaction",
              transaction: createTransaction({} as any),
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
              name: "transfer :: status is success: not all amount",
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
              name: "transfer :: status is success: all amount",
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
              name: "transfer :: status is error: not enough balance, not all amount",
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
              name: "transfer :: status is error: not enough balance, all amount",
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
              name: "transfer :: status is error: amount is 0",
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
              name: "transfer :: status is error: amount is negative",
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
              name: "transfer :: status is warning: recipient wallet not funded",
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
              name: "transfer :: status is warning: recipient address is off ed25519",
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
              name: "token.transfer :: status is success: recipient is funded wallet, assoc token acc exists",
              transaction: {
                model: {
                  kind: "token.transfer",
                  uiState: {
                    subAccountId: wSolSubAccId,
                  },
                },
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                recipient: testOnChainData.fundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: fees(1),
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                totalSpent:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
              },
            },
            {
              name: "token.transfer :: status is success: recipient is correct mint token acc",
              transaction: {
                model: {
                  kind: "token.transfer",
                  uiState: {
                    subAccountId: wSolSubAccId,
                  },
                },
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                recipient:
                  testOnChainData.wSolFundedAccountAssocTokenAccAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: fees(1),
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                totalSpent:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
              },
            },
            {
              name: "token.transfer :: status is error: recipient is another mint token acc",
              transaction: {
                model: {
                  kind: "token.transfer",
                  uiState: {
                    subAccountId: wSolSubAccId,
                  },
                },
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                recipient: testOnChainData.notWSolTokenAccAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new SolanaTokenAccountHoldsAnotherToken(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                totalSpent: zero,
              },
            },
            {
              name: "token.transfer :: status is warning: recipient is off curve",
              transaction: {
                model: {
                  kind: "token.transfer",
                  uiState: {
                    subAccountId: wSolSubAccId,
                  },
                },
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                recipient: testOnChainData.offEd25519Address,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {
                  recipient: new SolanaAddressOffEd25519(),
                },
                warnings: {},
                estimatedFees: fees(1),
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                totalSpent: zero,
              },
            },
            {
              name: "token.transfer :: status is success: recipient is wallet and no assoc token acc exists (will be created)",
              transaction: {
                model: {
                  kind: "token.transfer",
                  uiState: {
                    subAccountId: wSolSubAccId,
                  },
                },
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                recipient: testOnChainData.unfundedAddress,
                feeCalculator: testOnChainData.feeCalculator,
                family: "solana",
              },
              expectedStatus: {
                errors: {},
                warnings: {
                  recipient: new SolanaAccountNotFunded(),
                  recipientAssociatedTokenAccount:
                    new SolanaRecipientAssociatedTokenAccountWillBeFunded(),
                },
                // this fee is dynamic, skip
                //estimatedFees: new BigNumber(2044280),
                amount:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
                totalSpent:
                  testOnChainData.wSolSenderAssocTokenAccBalance.dividedBy(2),
              },
            },
          ],
        },
      ],
    },
  },
};

function makeAccount(freshAddress: string) {
  return {
    id: mainAccId,
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

type TransactionTestSpec = Exclude<
  Exclude<
    DatasetTest<Transaction>["currencies"][string]["accounts"],
    undefined
  >[number]["transactions"],
  undefined
>[number];

function recipientRequired(): TransactionTestSpec[] {
  const models: TransactionModel[] = [
    {
      kind: "token.transfer",
      uiState: {
        subAccountId: "",
      },
    },
    {
      kind: "transfer",
      uiState: {},
    },
  ];
  return models.map((model) => {
    return {
      name: `${model.kind} :: status is error: recipient required`,
      transaction: {
        model,
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
    };
  });
}

function recipientNotValid(): TransactionTestSpec[] {
  return recipientRequired().map((spec) => {
    return {
      ...spec,
      transaction: {
        ...(spec.transaction as Transaction),
        recipient: "invalid address",
      },
      expectedStatus: {
        ...spec.expectedStatus,
        errors: {
          recipient: new InvalidAddress(),
        },
      },
    };
  });
}

function recipientIsSameAsSender(): TransactionTestSpec[] {
  return recipientRequired().map((spec) => {
    return {
      ...spec,
      transaction: {
        ...(spec.transaction as Transaction),
        recipient: testOnChainData.fundedSenderAddress,
      },
      expectedStatus: {
        ...spec.expectedStatus,
        errors: {
          recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
        },
      },
    };
  });
}

function memoIsTooLong(): TransactionTestSpec[] {
  return compact(
    recipientRequired().map((spec) => {
      const tx = spec.transaction as Transaction;
      switch (tx.model.kind) {
        case "transfer":
        case "token.transfer":
          tx.model.uiState.memo = "c".repeat(MAX_MEMO_LENGTH + 1);
          return {
            ...spec,
            transaction: {
              ...(spec.transaction as Transaction),
              recipient: testOnChainData.fundedAddress,
            },
            expectedStatus: {
              ...spec.expectedStatus,
              errors: {
                memo: new SolanaMemoIsTooLong(),
              },
            },
          };
        case "token.createATA":
          return undefined;
        default:
          return assertUnreachable(tx.model);
      }
    })
  );
}

export default dataset;
