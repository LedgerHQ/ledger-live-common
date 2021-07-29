// @flow
import { fromTransactionRaw } from "../elrond/transaction";
import { BigNumber } from "bignumber.js";
import {
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
  InvalidAddress,
} from "@ledgerhq/errors";
import type { DatasetTest } from "../../types";
import type { Transaction } from "./types";

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    elrond: {
      scanAccounts: [
        {
          name: "elrond seed 1",
          apdus: `
          => ed030000080000000000000000
          <= 3e6572643176676670336737617a716a783477736d7474373036376d306c3632763370736d717a7232346a36787679776a32746c7a3067657376797a7371329000
          => ed030000080000000080000000
          <= 3e6572643176676670336737617a716a783477736d7474373036376d306c3632763370736d717a7232346a36787679776a32746c7a3067657376797a7371329000
          => ed030000080000000080000001
          <= 3e65726431706d33676a65326c6d643576796c6463767579366a7078676465347261706a70756a76756a6b65653661376a77327a6d6834747172653739367a9000
          `,
        },
      ],
      accounts: [
        {
          raw: {
            id: `js:2:elrond:erd1rnq7m8kdrpyfany4fweqtydsk4pgx0l6dtl6tvcad5wesagruxts62e9rk:`,
            seedIdentifier:
              "erd1rnq7m8kdrpyfany4fweqtydsk4pgx0l6dtl6tvcad5wesagruxts62e9rk",
            name: "Elrond 1",
            derivationMode: "",
            index: 0,
            freshAddress:
              "erd1rnq7m8kdrpyfany4fweqtydsk4pgx0l6dtl6tvcad5wesagruxts62e9rk",
            freshAddressPath: "44'/508'/0'/0/0'",
            freshAddresses: [],
            blockHeight: 0,
            operations: [],
            pendingOperations: [],
            currencyId: "elrond",
            unitMagnitude: 10,
            lastSyncDate: "",
            balance: "299569965",
          },
          transactions: [
            {
              name: "recipient and sender must not be the same",
              transaction: fromTransactionRaw({
                family: "elrond",
                recipient:
                  "erd1rnq7m8kdrpyfany4fweqtydsk4pgx0l6dtl6tvcad5wesagruxts62e9rk",
                amount: "100000000",
                mode: "send",
                fees: null,
              }),
              expectedStatus: {
                amount: BigNumber("100000000"),
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
              },
            },
            {
              name: "Not a valid address",
              transaction: fromTransactionRaw({
                family: "elrond",
                recipient: "elrondinv",
                amount: BigNumber("100000000"),
                mode: "send",
                fees: null,
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
                family: "elrond",
                recipient:
                  "erd1frj909pfums4m8aza596595l9pl56crwdj077vs2aqcw6ynl28wsfkw9rd",
                amount: BigNumber("1000000000000000"),
                mode: "send",
                fees: null,
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
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
