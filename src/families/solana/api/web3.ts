import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  ConfirmedSignatureInfo,
  ParsedConfirmedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { chunk } from "lodash";
import { Operation } from "../../../types";
import { NetworkInfo } from "../types";

import { parseIxNames } from "./instructions/parser";

const conn = new Connection(clusterApiUrl("mainnet-beta"), "finalized");

export const getAccount = async (address: string) => {
  const pubKey = new PublicKey(address);

  const [balanceLamportsWithContext, lamportPerSignature] = await Promise.all([
    conn.getBalanceAndContext(pubKey),
    getNetworkInfo().then((res) => res.lamportsPerSignature),
  ]);

  const balance = new BigNumber(balanceLamportsWithContext.value);
  const spendableBalance = BigNumber.max(balance.minus(lamportPerSignature), 0);
  const blockHeight = balanceLamportsWithContext.context.slot;

  return {
    balance,
    spendableBalance,
    blockHeight,
  };
};

export const getNetworkInfo = async (): Promise<NetworkInfo> => {
  const { feeCalculator } = await conn.getRecentBlockhash();

  return {
    family: "solana",
    lamportsPerSignature: new BigNumber(feeCalculator.lamportsPerSignature),
  };
};

function onChainTxToOperation(
  txDetails: TransactionDetails,
  accountId: string,
  accountAddress: string
): Operation | undefined {
  if (!txDetails.info.blockTime) {
    return undefined;
  }

  if (!txDetails.parsed.meta) {
    return undefined;
  }

  const accountIndex =
    txDetails.parsed.transaction.message.accountKeys.findIndex(
      (pma) => pma.pubkey.toBase58() === accountAddress
    );

  if (accountIndex < 0) {
    return undefined;
  }

  const { preBalances, postBalances } = txDetails.parsed.meta;

  const balanceDelta = new BigNumber(postBalances[accountIndex]).minus(
    new BigNumber(preBalances[accountIndex])
  );

  const txType = balanceDelta.lt(0)
    ? "OUT"
    : balanceDelta.gt(0)
    ? "IN"
    : "NONE";

  const { senders, recipients } =
    txDetails.parsed.transaction.message.accountKeys.reduce(
      (acc, account, i) => {
        const balanceDelta = new BigNumber(postBalances[i]).minus(
          new BigNumber(preBalances[i])
        );
        if (balanceDelta.lt(0)) {
          acc.senders.push(account.pubkey.toBase58());
        } else if (balanceDelta.gt(0)) {
          acc.recipients.push(account.pubkey.toBase58());
        }
        return acc;
      },
      {
        senders: [] as string[],
        recipients: [] as string[],
      }
    );

  const isFeePayer =
    txDetails.parsed.transaction.message.accountKeys[0].pubkey.toBase58() ===
    accountAddress;

  const fee = new BigNumber(isFeePayer ? txDetails.parsed.meta.fee : 0);

  const instructionNames =
    txDetails.parsed.transaction.message.instructions.map((ix) => {
      const [programName, typeName] =
        "parsed" in ix
          ? [ix.program, ix.parsed?.type as string | undefined]
          : parseIxNames(ix);

      return `${programName || "Unknown"}${typeName ? `.${typeName}` : ""}`;
    });

  const txHash = txDetails.info.signature;
  return {
    id: txHash,
    hash: txHash,
    accountId,
    hasFailed: !!txDetails.info.err,
    blockHeight: txDetails.info.slot,
    blockHash: txDetails.parsed.transaction.message.recentBlockhash,
    extra: {
      memo: txDetails.info.memo ?? undefined,
      instructions: instructionNames.join(", "),
    },
    type: txType,
    senders,
    recipients,
    date: new Date(txDetails.info.blockTime * 1000),
    value: balanceDelta.abs().minus(fee),
    fee,
  };
}

type TransactionDetails = {
  parsed: ParsedConfirmedTransaction;
  info: ConfirmedSignatureInfo;
};

async function* getSuccessfullTransactionsDetailsBatched(
  pubKey: PublicKey,
  untilTxSignature?: string
): AsyncGenerator<TransactionDetails[], void, unknown> {
  const signatures = await conn.getSignaturesForAddress(pubKey, {
    until: untilTxSignature,
    limit: 1000,
  });

  //TODO: check if payload for 1000 txs is > 50kb
  const batchSize = 1000;

  for (const signaturesInfoBatch of chunk(signatures, batchSize)) {
    const transactions = await conn.getParsedConfirmedTransactions(
      signaturesInfoBatch.map((tx) => tx.signature)
    );
    const txsDetails = transactions.reduce((acc, tx, index) => {
      if (tx && !tx.meta?.err && tx.blockTime) {
        acc.push({
          info: signaturesInfoBatch[index],
          parsed: tx,
        });
      }
      return acc;
    }, [] as TransactionDetails[]);

    yield txsDetails;
  }
}

export const getOperations = async (
  accountId: string,
  address: string,
  untilTxHash?: string
): Promise<Operation[]> => {
  const pubKey = new PublicKey(address);

  const operations: Operation[] = [];

  const untilTxSignature = untilTxHash;

  for await (const txDetailsBatch of getSuccessfullTransactionsDetailsBatched(
    pubKey,
    untilTxSignature
  )) {
    operations.push(
      ...txDetailsBatch.reduce((acc, txDetails) => {
        const op = onChainTxToOperation(txDetails, accountId, address);
        if (op) {
          acc.push(op);
        }
        return acc;
      }, [] as Operation[])
    );
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
  memo,
}: {
  fromAddress: string;
  toAddress: string;
  amount: BigNumber;
  memo?: string;
}) => {
  const fromPublicKey = new PublicKey(fromAddress);
  const toPublicKey = new PublicKey(toAddress);

  const { blockhash: recentBlockhash } = await conn.getRecentBlockhash();

  const onChainTx = new Transaction({
    feePayer: fromPublicKey,
    recentBlockhash,
  });

  const transferIx = SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports: amount.toNumber(),
  });

  onChainTx.add(transferIx);

  if (memo) {
    const memoIx = new TransactionInstruction({
      keys: [],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(memo),
    });
    onChainTx.add(memoIx);
  }

  return onChainTx;
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
