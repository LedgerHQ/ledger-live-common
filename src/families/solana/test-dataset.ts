import BigNumber from "bignumber.js";
import type { DatasetTest } from "../../types";

import { Transaction } from "./types";

const dataset: DatasetTest<Transaction> = {
    implementations: ["js"],
    currencies: {
        solana: {
            scanAccounts: [
                {
                    name: "solana seed 1",
                    apdus: `
                    => e005000009028000002c800001f5
                    <= 5eb9862fe23e544a2a0969cc157cb31fd72901cc2824d536a67fb8ee911e02369000
                    => e005000015058000002c800001f5800000008000000080000000
                    <= 4d65a10662b9759d62bb59048366705454654cf4f9b4b3525cf314429e46c6919000
                    => e005000015058000002c800001f5800000018000000080000000
                    <= d7ca6918d6747bf39cf8cf8a104f7a6f0ea7b13eb16971bdc40c90454155ba059000
                    `,
                },
            ],
            accounts: [
                {
                    raw: {
                        id: "js:2:tron:TRqkRnAj6ceJFYAn2p1eE7aWrgBBwtdhS9:",
                        seedIdentifier: "seed",
                        name: "Tron 1",
                        derivationMode: "",
                        index: 0,
                        freshAddress: "fresh",
                        freshAddressPath: "44'/195'/0'/0/0",
                        pendingOperations: [],
                        currencyId: "solana",
                        unitMagnitude: 18,
                        balance: "26000197",
                        spendableBalance: "197",
                        subAccounts: [],
                        operations: [],
                        freshAddresses: [
                            {
                                address: "fresh",
                                derivationPath: "44'/501'/0'/0/0",
                            },
                        ],
                        lastSyncDate: "",
                        blockHeight: 0,
                    },
                    transactions: [
                        {
                            name: "test",
                            transaction: {
                                family: "solana",
                                amount: new BigNumber(1),
                                networkInfo: {
                                    family: "solana",
                                    feeSOLPerSignature: new BigNumber(0),
                                    recentBlockhash: "333",
                                },
                                recipient: "some recipient",
                            },
                            expectedStatus: {},
                        },
                    ],
                },
            ],
        },
    },
};

export default dataset;
