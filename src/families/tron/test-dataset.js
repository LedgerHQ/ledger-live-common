// @flow
import { BigNumber } from "bignumber.js";
import type { DatasetTest } from "../../__tests__/test-helpers/bridge";
import { fromTransactionRaw } from "./transaction";
import type { Transaction } from "./types";
import { toAccountRaw } from "../../account";

const dataset: DatasetTest<Transaction> = {
  implementations: ["tronjs"],
  currencies: {
    tron: {
      scanAccounts: [
        {
          name: "seedtest1",
          apdus: `
            => e0d800000454726f6e
            <= 9000
            => b001000000
            <= 010454726f6e05302e312e3301029000
            => e002000009028000002c800000c3
            <= 41047d56ae0676058055c9ebadaa07431d7225c242faaae6f59a42154d06111d34589a65b9a99331760934b6d81ed9cba007a93387532bb089d2937d0794a5cbbf6d2254556f786a717a6a3367516538513547434856413134684e34776166753831507a319000
            => e002000015058000002c800000c3800000000000000000000000
            <= 4104bb1ee71fde3e4fe61c2ad9cbd52d752699edc3ed3af52c724b0dfbf0960fe435cb512a10ea59d0a101c748ae7c9233f44c38459efe53b60f38c566e7e3eac73b2254463169476b4b797876574276644e443568774a694b7a4378744b71344d6943786d9000
            => e002000015058000002c800000c3800000010000000000000000
            <= 41041d5f1d7ffdf758267d4c05f09c1257fb2891e008f1c33570fc66655718c9a651687104607f8f1e4e03b83a31737b611957f16afb8133f067f2529121b761fcce22544770756f584a43726e774234683155356e69464733613861524b4d6774625466399000
            => b0a7000000
            <= 9000
          `
        }
      ],
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
