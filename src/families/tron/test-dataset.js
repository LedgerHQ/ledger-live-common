// @flow
import { BigNumber } from "bignumber.js";
import type { DatasetTest } from "../../__tests__/test-helpers/bridge";
import { fromTransactionRaw } from "./transaction";
import type { Transaction } from "./types";

const dataset: DatasetTest<Transaction> = {
  implementations: ["tronjs"],
  currencies: {
    tron: {
      accounts: [
        {
          transactions: [
            {
              name: "success1",
              transaction: fromTransactionRaw({
                family: "tron",
                recipient: "TLKCi5WwJx79abs5ctQYCyL2pHCyQGZaXM",
                amount: "10",
                networkInfo: null,
                mode: "send",
                duration: undefined,
                resource: undefined,
                votes: []
              }),
              expectedStatus: {
                amount: BigNumber("10"),
                errors: {},
                warnings: {},
                totalSpent: BigNumber("10"),
                estimatedFees: BigNumber("0")
              }
            }
          ],
          raw: {
            id: "js:2:tron:TF1iGkKyxvWBvdND5hwJiKzCxtKq4MiCxm:",
            seedIdentifier: "TF1iGkKyxvWBvdND5hwJiKzCxtKq4MiCxm",
            name: "Tron 1",
            derivationMode: "",
            index: 0,
            freshAddress: "TF1iGkKyxvWBvdND5hwJiKzCxtKq4MiCxm",
            freshAddressPath: "44'/195'/0'/0/0",
            pendingOperations: [],
            currencyId: "tron",
            unitMagnitude: 18,
            balance: "22000000",
            subAccounts: [],
            operations: [],
            freshAddresses: [
              {
                address: "TF1iGkKyxvWBvdND5hwJiKzCxtKq4MiCxm",
                derivationPath: "44'/195'/0'/0/0"
              }
            ],
            lastSyncDate: "",
            blockHeight: 0
          }
        }
      ]
    }
  }
};

export default dataset;
