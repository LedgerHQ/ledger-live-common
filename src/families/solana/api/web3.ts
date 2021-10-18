import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  ConfirmedSignatureInfo,
  ParsedConfirmedTransaction,
  ParsedMessage,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { chunk } from "lodash";
import { Operation } from "../../../types";
import { NetworkInfo } from "../types";

import { create, type, string, number } from "superstruct";
import { encodeOperationId } from "../../../operation";

const isDevMode = true;
const conn2 = new Connection(
  clusterApiUrl(isDevMode ? "devnet" : "mainnet-beta"),
  "finalized"
);

const conn = new Connection("http://api.devnet.solana.com/", "finalized");

export const getAccount = async (address: string) => {
  const pubKey = new PublicKey(address);

  const [balanceLamportsWithContext, lamportPerSignature] = await Promise.all([
    conn.getBalanceAndContext(pubKey),
    getNetworkInfo().then((res) => res.lamportsPerSignature),
  ]);

  const balance = new BigNumber(balanceLamportsWithContext.value);
  const spendableBalance = BigNumber.max(balance.minus(lamportPerSignature), 0);
  // how to get the block height for the account
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

function tryParseAsTransferIxInfo(ix: ParsedMessage["instructions"][number]) {
  if ("parsed" in ix && ix.program === "system") {
    try {
      if (ix.parsed.type === "transfer") {
        return create(
          ix.parsed.info,
          type({
            source: string(),
            destination: string(),
            lamports: number(),
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
      if (transferInfo !== undefined && txDetails.info.blockTime) {
        if (
          accountAddress === transferInfo.source ||
          accountAddress === transferInfo.destination
        ) {
          const txHash = `${txDetails.info.signature}:ix:${ixIndex}`;
          const txType = accountAddress === transferInfo.source ? "OUT" : "IN";
          const ixId = encodeOperationId(accountId, txHash, txType);
          const fee = new BigNumber(txDetails.parsed.meta?.fee ?? 0);
          const txLamports = new BigNumber(transferInfo.lamports);
          acc.push({
            id: ixId,
            hash: ixId,
            accountId,
            date: new Date(txDetails.info.blockTime * 1000),
            senders: [transferInfo.source],
            recipients: [transferInfo.destination],
            type: txType,
            // TODO: double check if block height === slot here
            blockHeight: txDetails.info.slot,
            // TODO: aslo double check that
            blockHash: txDetails.parsed.transaction.message.recentBlockhash,
            extra: {},
            // fee is actually lamports _per_ signature, is it multiplied in meta.fee ?
            fee,
            value: txType === "OUT" ? txLamports.plus(fee) : txLamports,
          });
        } else {
          // ignore for now non transfer ops
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

  const untilTxSignature = untilTxHash?.split(":")[0];

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
