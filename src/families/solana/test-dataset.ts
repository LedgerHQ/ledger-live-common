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
                    `,
                },
            ],
        },
    },
};

export default dataset;
