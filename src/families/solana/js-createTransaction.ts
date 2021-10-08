import { BigNumber } from "bignumber.js";
import type { Transaction } from "./types";

/**
 * Create an empty transaction
 *
 * @returns {Transaction}
 */
const createTransaction = (): Transaction => ({
    family: "solana",
    amount: new BigNumber(0),
    recipient: "",
    fees: new BigNumber(0),
});

export default createTransaction;
