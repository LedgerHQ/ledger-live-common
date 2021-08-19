// @flow
import { BigNumber } from "bignumber.js";
import type { Transaction } from "./types";

/**
 * Create an empty transaction
 *
 * @returns {Transaction}
 */
const createTransaction = () => {
  console.log("XXX - createTransaction - START/END");

  return {
    family: "bitcoin",
    amount: BigNumber(0),
    utxoStrategy: {
      strategy: 0,
      pickUnconfirmedRBF: false,
      excludeUTXOs: [],
    },
    recipient: "",
    rbf: false,
    feePerByte: null,
    networkInfo: null,
    useAllAmount: false,
    feesStrategy: "medium",
  };
};

export default createTransaction;
