import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Operation } from "../../../types";
import { NetworkInfo } from "../types";

const conn = new Connection("https://api.devnet.solana.com/");

export const getAccount = async (address: string) => {
    const pubKey = new PublicKey(address);
    const [balanceLamports, lamportPerSignature] = await Promise.all([
        conn.getBalance(pubKey),
        getNetworkInfo().then((res) => res.lamportsPerSignature),
    ]);

    const balance = new BigNumber(balanceLamports);
    const spendableBalance = balance.minus(lamportPerSignature);

    return {
        balance,
        spendableBalance,
    };
};

export const getNetworkInfo = async (): Promise<NetworkInfo> => {
    const { blockhash, feeCalculator } = await conn.getRecentBlockhash();

    return {
        family: "solana",
        lamportsPerSignature: new BigNumber(feeCalculator.lamportsPerSignature),
        recentBlockhash: blockhash,
    };
};

export const getOperations = async (
    id: string,
    address: string,
    startAt: number
): Promise<Operation[]> => {
    const pubKey = new PublicKey(address);
    const signatures = await conn.getSignaturesForAddress(pubKey);
    //return signatures.map((signature) => {});
    return [];
};

export const checkOnChainAccountExists = async (address: string) => {
    const pubKey = new PublicKey(address);
    return !!(await conn.getAccountInfo(pubKey));
};

export const buildTransferTransaction = ({
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
    const fromPublicKey = new PublicKey(fromAddress);
    const toPublicKey = new PublicKey(toAddress);

    const transferTx = SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: amount.toNumber(),
    });

    return new Transaction({
        feePayer: fromPublicKey,
        recentBlockhash,
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
