import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Account, Operation } from "../../../types";
//import { getAccountSpendableBalance } from "../logic";

const conn = new Connection("https://api.devnet.solana.com/");

export const getAccount = async (address: string) => {
    const pubKey = new PublicKey(address);
    const [balanceLamports, transactionFeeSOL] = await Promise.all([
        conn.getBalance(pubKey),
        getTransactionFee(),
    ]);

    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
    const spendableBalanceSOL = balanceSOL - transactionFeeSOL;

    return {
        balance: new BigNumber(balanceSOL),
        spendableBalance: new BigNumber(spendableBalanceSOL),
    };
};

export const getTransactionFee = async () => {
    const response = await conn.getRecentBlockhash();
    return response.feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
};

export const getOperations = async (
    id: string,
    address: string,
    startAt: number
): Promise<Operation[]> => {
    const pubKey = new PublicKey(address);
    const signatures = await conn.getSignaturesForAddress(pubKey);
    return [];
};

export const checkOnChainAccountExists = async (address: string) => {
    const pubKey = new PublicKey(address);
    return !!(await conn.getAccountInfo(pubKey));
};

async function go() {
    return new PublicKey("hui");
    const acc = await getAccount(
        "3tgkMfug2gs82sy2wexQjMkR12JzFcX9rSLd9yM9m38g"
    );
    console.log(acc);
}

go();
