import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { getEnv } from "../../../env";
import { Operation } from "../../../types";
import { NetworkInfo } from "../types";

const isDevMode = !!getEnv("DEVELOPMENT_MODE");
const conn = new Connection(
  clusterApiUrl(isDevMode ? "devnet" : "mainnet-beta"),
  "confirmed"
);

export const getAccount = async (address: string) => {
  const pubKey = new PublicKey(address);
  const [balanceLamports, lamportPerSignature] = await Promise.all([
    conn.getBalance(pubKey),
    getNetworkInfo().then((res) => res.lamportsPerSignature),
  ]);

  const balance = new BigNumber(balanceLamports);
  const spendableBalance = BigNumber.max(balance.minus(lamportPerSignature), 0);

  return {
    balance,
    spendableBalance,
  };
};

export const getNetworkInfo = async (): Promise<NetworkInfo> => {
  const { feeCalculator } = await conn.getRecentBlockhash();

  return {
    family: "solana",
    lamportsPerSignature: new BigNumber(feeCalculator.lamportsPerSignature),
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

export const buildTransferTransaction = async ({
  fromAddress,
  toAddress,
  amount,
}: {
  fromAddress: string;
  toAddress: string;
  amount: BigNumber;
}) => {
  const fromPublicKey = new PublicKey(fromAddress);
  const toPublicKey = new PublicKey(toAddress);

  const transferTx = SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports: amount.toNumber(),
  });

  const { blockhash: recentBlockhash } = await conn.getRecentBlockhash();

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
