import BigNumber from "bignumber.js";
import type { Account } from "../../types";
import { getTxFeeAndRecentBlockhash } from "./api";

import type { Transaction } from "./types";

const prepareTransaction = async (
    a: Account,
    tx: Transaction
): Promise<Transaction> => {
    const { txFee, recentBlockhash } = await getTxFeeAndRecentBlockhash();
    return {
        ...tx,
        fees: new BigNumber(txFee),
        recentBlockhash,
    };
};

export default prepareTransaction;
