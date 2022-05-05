import type { DatasetTest } from "../../types";
import type { Transaction } from "./types";
import {
  NotEnoughBalance,
  RecipientRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  AmountRequired,
} from "@ledgerhq/errors";
import { fromTransactionRaw } from "./transaction";

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    hedera: {
      scanAccounts: [
        {
          name: "hedera seed 1",
          apdus: `
          => e002010009000000002c00000bd6
          <= 9e92a312233d5fd6b5a723875aeea2cea81a8e48ffc00341cff6dffcfd3ab7f29000
          `,
        },
      ],
      accounts: [
        {
          raw: {
            id: `js:2:hedera:0.0.751515:`,
            seedIdentifier: "",
            name: "Hedera 1",
            derivationMode: "",
            index: 0,
            freshAddress: "0.0.751515",
            freshAddressPath: "44/3030/0/0/0",
            freshAddresses: [],
            blockHeight: 0,
            operations: [],
            pendingOperations: [],
            currencyId: "hedera",
            unitMagnitude: 8,
            lastSyncDate: "",
            balance: "0",
          },
          transactions: [
            {
              name: "Not a valid address",
              transaction: fromTransactionRaw({
                family: "hedera",
                recipient: "not a valid address",
                amount: "100000000",
              }),
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddress(),
                },
                warnings: {},
              },
            },
            {
              name: "Recipient and sender must not be the same",
              transaction: fromTransactionRaw({
                family: "hedera",
                recipient: "0.0.751515",
                amount: "100000000",
              }),
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
              },
            },
            {
              name: "Amount Required",
              transaction: fromTransactionRaw({
                family: "hedera",
                recipient: "0.0.751515",
                amount: "0",
              }),
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
              },
            },
            {
              name: "Not enough balance",
              transaction: fromTransactionRaw({
                family: "hedera",
                recipient: "0.0.751515",
                amount: "1000000000000000",
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
              },
            },
            {
              name: "No recipient",
              transaction: fromTransactionRaw({
                family: "hedera",
                recipient: "",
                amount: "1",
              }),
              expectedStatus: {
                errors: {
                  recipient: new RecipientRequired(),
                },
                warnings: {},
              },
            },
          ],
        },
      ],
    },
  },
};

export default dataset;
