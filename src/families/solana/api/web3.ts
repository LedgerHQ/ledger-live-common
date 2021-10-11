import {
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Account, Operation } from "../../../types";
//import { getAccountSpendableBalance } from "../logic";

const conn = new Connection("https://api.devnet.solana.com/");

export const getAccount = async (address: string) => {
    const pubKey = new PublicKey(address);
    const [balanceLamports, transactionFeeSOL] = await Promise.all([
        conn.getBalance(pubKey),
        getTxFeeAndRecentBlockhash().then((res) => res.txFee),
    ]);

    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
    const spendableBalanceSOL = balanceSOL - transactionFeeSOL;

    // TODO: check if spendable balance needs to be here
    return {
        balance: new BigNumber(balanceSOL),
        spendableBalance: new BigNumber(spendableBalanceSOL),
    };
};

export const getTxFeeAndRecentBlockhash = async () => {
    const response = await conn.getRecentBlockhash();

    return {
        txFee: response.feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL,
        recentBlockhash: response.blockhash,
    };
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

export const buildOnChainTransferTransaction = ({
    fromAddress,
    toAddress,
    amount,
    recentBlockhash,
}: {
    fromAddress: string;
    toAddress: string;
    amount: BigNumber;
    recentBlockhash: string;
}) => {
    const transferTx = SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(toAddress),
        lamports: amount.toNumber() * LAMPORTS_PER_SOL,
    });

    return new Transaction({
        //re
        //feePayer
    }).add(transferTx);
};

export const addSignatureToTransaction = ({
    tx,
    address,
    signature,
}: {
    tx: Transaction;
    address: string;
    signature: Buffer;
}) => {
    tx.addSignature(new PublicKey(address), signature);

    return tx;
};

export const broadcastTransaction = (rawTx: Buffer) => {
    return conn.sendRawTransaction(rawTx);
};

/*
async function go() {
    return new PublicKey("hui");
    const acc = await getAccount(
        "3tgkMfug2gs82sy2wexQjMkR12JzFcX9rSLd9yM9m38g"
    );
    console.log(acc);
}

go();

*/
