import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  ConfirmedSignatureInfo,
  ConfirmedTransaction,
  ParsedConfirmedTransaction,
  ParsedMessage,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { chunk } from "lodash";
import { getEnv } from "../../../env";
import { Operation } from "../../../types";
import { NetworkInfo } from "../types";

import { create, type, string, number } from "superstruct";

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
    // TODO: limit history shown in ledger?
    // TODO: use a timeout?
    yield* getSignaturesForAddressBatched(
      address,
      signatures[signatures.length - 1].signature,
      untilSignature
    );
  }
}

function tryParseAsTransferIxInfo(ix: ParsedMessage["instructions"][number]) {
  if ("parsed" in ix && ix.program === "system") {
    try {
      if (ix.parsed.type === "transfer") {
        return create(
          ix.parsed.info,
          type({
            source: string(),
            destination: string(),
            lamprots: number(),
          })
        );
      }
    } catch (e) {
      // TODO: notify error?
      console.error(e);
    }
  }
}

function onChainTxToOperations(
  txDetails: TransactionDetails,
  accountId: string,
  accountAddress: string
) {
  return txDetails.parsed.transaction.message.instructions.reduce(
    (acc, ix, ixIndex) => {
      const transferInfo = tryParseAsTransferIxInfo(ix);
      if (transferInfo !== undefined) {
        if (
          accountAddress === transferInfo.source ||
          accountAddress === transferInfo.destination
        ) {
          const ixId = `${txDetails.info.signature}:ix:${ixIndex}`;
          const isOut = accountAddress === transferInfo.source;
          const fee = new BigNumber(txDetails.parsed.meta?.fee ?? 0);
          const txLamports = new BigNumber(transferInfo.lamprots);
          acc.push({
            id: ixId,
            hash: ixId,
            accountId,
            //TODO: what if block time is 0?
            date: new Date((txDetails.info.blockTime ?? 0) * 1000),
            senders: [transferInfo.source],
            recipients: [transferInfo.destination],
            // TODO: fix type
            type: isOut ? "OUT" : "IN",
            // TODO: what if fee is not there?
            blockHeight: null,
            blockHash: null,
            extra: {},
            fee,
            value: isOut ? txLamports.plus(fee) : txLamports,
          });
        } else {
          // just a fees op?
        }
      }
      return acc;
    },
    [] as Operation[]
  );
}

type TransactionDetails = {
  parsed: ParsedConfirmedTransaction;
  info: ConfirmedSignatureInfo;
};

async function* getSuccessfullTransactionsDetailsBatched(
  pubKey: PublicKey,
  untilTxSignature?: string
): AsyncGenerator<TransactionDetails[], void, unknown> {
  const batchSize = 20;

  for await (const signatures of getSignaturesForAddressBatched(
    pubKey,
    untilTxSignature
  )) {
    for (const signaturesInfoBatch of chunk(signatures, batchSize)) {
      const transactions = await conn.getParsedConfirmedTransactions(
        signaturesInfoBatch.map((tx) => tx.signature)
      );
      const txsDetails = transactions.reduce((acc, tx, index) => {
        if (tx && !tx.meta?.err) {
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
}

export const getOperations = async (
  accountId: string,
  address: string,
  untilTxSignature?: string
): Promise<Operation[]> => {
  const pubKey = new PublicKey(address);

  const operations: Operation[] = [];

  for await (const txDetailsBatch of getSuccessfullTransactionsDetailsBatched(
    pubKey,
    untilTxSignature
  )) {
    operations.push(
      ...txDetailsBatch.flatMap((txDetails) =>
        onChainTxToOperations(txDetails, accountId, address)
      )
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
