import { BigNumber } from "bignumber.js";
import {
  AmountRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
} from "@ledgerhq/errors";

import type { DatasetTest } from "../../types";
import type { Transaction } from "./types";
import { fromTransactionRaw } from "../filecoin/transaction";

const SEED_IDENTIFIER = "f1zx43cf6qb6rd5e4okl7lexnjumxe5toqj6vtr3i";
const ACCOUNT_1 = "t1d2xrzcslx7xlbbylc5c3d5lvandqw4iwl6epxba";

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    filecoin: {
      FIXME_ignoreAccountFields: [],
      scanAccounts: [
        {
          name: "filecoin seed 1",
          apdus: `
          => 0600000000
          <= 0000120501311000049000
          => 06010000142c000080cd010080000000800000000000000000
          <= 041e10b3a453db1e7324cd37e78820d7d150c13ba3bf784be204c91afe495816a19a836e85cb89b0e4ff36d06a71a9ca02947de79e16e66dacc645e46dcdf7d9091501cdf9b117d00fa23e938e52feb25da9a32e4ecdd02966317a78343363663671623672643565346f6b6c376c65786e6a756d786535746f716a3676747233699000
          `,
        },
      ],
      accounts: [
        {
          FIXME_tests: ["balance is sum of ops"],
          raw: {
            id: `js:2:filecoin:${SEED_IDENTIFIER}:filecoin`,
            seedIdentifier: SEED_IDENTIFIER,
            name: "Filecoin 1",
            derivationMode: "filecoin",
            index: 0,
            freshAddress: SEED_IDENTIFIER,
            freshAddressPath: "44'/461'/0'/0/0",
            freshAddresses: [],
            blockHeight: 0,
            operations: [],
            pendingOperations: [],
            currencyId: "filecoin",
            unitMagnitude: 18,
            lastSyncDate: "",
            balance: "100000000000",
          },
          transactions: [
            {
              name: "recipient and sender must not be the same",
              transaction: fromTransactionRaw({
                family: "filecoin",
                method: 1,
                version: 1,
                nonce: 100,
                gasFeeCap: "1000",
                gasLimit: 100,
                gasPremium: "200",
                recipient: SEED_IDENTIFIER,
                amount: "100000000",
              }),
              expectedStatus: {
                amount: new BigNumber("100000000"),
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
              },
            },
            {
              name: "Not a valid address",
              transaction: fromTransactionRaw({
                family: "filecoin",
                method: 1,
                version: 1,
                nonce: 100,
                gasFeeCap: "1000",
                gasLimit: 100,
                gasPremium: "200",
                recipient: "novalidaddress",
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
              name: "Not enough balance",
              transaction: fromTransactionRaw({
                family: "filecoin",
                method: 1,
                version: 1,
                nonce: 100,
                gasFeeCap: "1000",
                gasLimit: 10,
                gasPremium: "10000",
                recipient: ACCOUNT_1,
                amount: "100000000000000000000000000",
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
              },
            },
            {
              name: "Amount Required",
              transaction: fromTransactionRaw({
                family: "filecoin",
                method: 1,
                version: 1,
                nonce: 100,
                gasFeeCap: "1000",
                gasLimit: 10,
                gasPremium: "10000",
                recipient: ACCOUNT_1,
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
              name: "New account and sufficient amount",
              transaction: fromTransactionRaw({
                family: "filecoin",
                method: 1,
                version: 1,
                nonce: 100,
                gasFeeCap: "1000",
                gasLimit: 10,
                gasPremium: "10000",
                recipient: ACCOUNT_1,
                amount: "1",
              }),
              expectedStatus: {
                amount: new BigNumber("1"),
                errors: {},
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
