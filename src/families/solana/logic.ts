import { AccountInfo, PublicKey } from "@solana/web3.js";

/*
export const getAccountSpendableBalance = async (
    balance: number,
    transactionFee: number
): Promise<number> => {
    return balance - transactionFee;
};
*/

export const isAddressValid = (address: string) => {
    try {
        const _ = new PublicKey(address);
        return true;
    } catch (_) {
        return false;
    }
};

export const checkRecipientExist = (address: string) => {};
