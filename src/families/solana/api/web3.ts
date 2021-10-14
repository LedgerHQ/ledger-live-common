import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  ConfirmedSignatureInfo,
  ConfirmedTransaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { chunk } from "lodash";
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

async function* getSignaturesForAddressBatched(
  address: PublicKey,
  beforeSignature?: string,
  untilSignature?: string
): AsyncGenerator<ConfirmedSignatureInfo[], void, unknown> {
  const batchSize = 1000;
  const signatures = await conn.getSignaturesForAddress(address, {
    before: beforeSignature,
    until: untilSignature,
    limit: batchSize,
  });
  yield signatures;
  if (signatures.length >= batchSize) {
    yield* getSignaturesForAddressBatched(
      address,
      signatures[signatures.length - 1].signature,
      untilSignature
    );
  }
}

async function* getOperationsBatched(
  pubKey: PublicKey,
  untilTxSignature?: string
): AsyncGenerator<Operation[], void, unknown> {
  const batchSize = 20;

  for await (const signatures of getSignaturesForAddressBatched(
    pubKey,
    untilTxSignature
  )) {
    for (const batch of chunk(signatures, batchSize)) {
      const transactions = await conn.getParsedConfirmedTransactions(
        batch.map((tx) => tx.signature)
      );
      const operations = transactions.reduce((acc, tx) => {
        if (tx) {
          tx.transaction;
        }
        return acc;
      }, [] as Operation[]);

      yield operations;
    }
  }
}

export const getOperations = async (
  address: string,
  untilTxSignature?: string
): Promise<Operation[]> => {
  const pubKey = new PublicKey(address);

  const operations: Operation[] = [];

  for await (const batch of getOperationsBatched(pubKey, untilTxSignature)) {
    operations.push(...batch);
  }

  return operations;
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
