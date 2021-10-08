import { AccountInfo } from "@solana/web3.js";

export const getAccountSpendableBalance = async (
    account: AccountInfo
): Promise<number> => {
    const fees = account;
    const baseFee = await fetchBaseFee();
    return BigNumber.max(balance.minus(minimumBalance).minus(baseFee), 0);
};
