import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  ConfirmedSignatureInfo,
  ParsedConfirmedTransaction,
  ParsedMessage,
  SystemInstruction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { chunk, sum } from "lodash";
import { Operation } from "../../../types";
import { NetworkInfo } from "../types";

import { create, type, string, number, Infer } from "superstruct";
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

type TransferInfo = Infer<typeof TransferInfo>;
const TransferInfo = type({
  source: string(),
  destination: string(),
  lamports: number(),
});

type TransferWithSeedInfo = Infer<typeof TransferWithSeedInfo>;
const TransferWithSeedInfo = type({
  source: string(),
  sourceBase: string(),
  destination: string(),
  lamports: number(),
  sourceSeed: string(),
  sourceOwner: string(),
});

function tryParseAsTransferIxInfo(
  ix: ParsedMessage["instructions"][number]
): TransferInfo | TransferWithSeedInfo | undefined {
  if ("parsed" in ix && ix.program === "system") {
    try {
      switch (ix.parsed.type) {
        case "transfer":
          return create(ix.parsed.info, TransferInfo);
        case "transferWithSeed":
          return create(ix.parsed.info, TransferWithSeedInfo);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

function onChainTxToOperation(
  txDetails: TransactionDetails,
  accountId: string,
  accountAddress: string
): Operation | undefined {
  const blockTime = txDetails.info.blockTime;

  if (!blockTime) {
    return undefined;
  }

  if (txDetails.info.err) {
    return undefined;
  }

  const internalTransferOperations =
    txDetails.parsed.transaction.message.instructions.reduce(
      (acc, ix, ixIndex) => {
        const transferInfo = tryParseAsTransferIxInfo(ix);
        if (transferInfo !== undefined && txDetails.info.blockTime) {
          if (
            accountAddress === transferInfo.source ||
            accountAddress === transferInfo.destination
          ) {
            const ixHash = `${txDetails.info.signature}:ix:${ixIndex}`;
            const transferDirection =
              accountAddress === transferInfo.source ? "OUT" : "IN";
            const ixId = encodeOperationId(
              accountId,
              ixHash,
              transferDirection
            );
            const ixLamports = new BigNumber(transferInfo.lamports);
            acc.push({
              id: ixId,
              hash: ixHash,
              accountId,
              date: new Date(blockTime * 1000),
              senders: [transferInfo.source],
              recipients: [transferInfo.destination],
              type: transferDirection,
              // TODO: double check if block height === slot here
              blockHeight: txDetails.info.slot,
              // TODO: aslo double check that
              blockHash: txDetails.parsed.transaction.message.recentBlockhash,
              extra: {},
              // fee is actually lamports _per_ signature, is it multiplied in meta.fee ?
              fee: new BigNumber(0),
              //value: transferDirection === "OUT" ? txLamports.plus(fee) : txLamports,
              value: ixLamports,
            });
          } else {
            // ignore for now non transfer ops
          }
        }
        return acc;
      },
      [] as Operation[]
    );

  if (internalTransferOperations.length === 0) {
    return undefined;
  }

  const transferSummary = internalTransferOperations.reduce(
    (summary, op) => {
      summary.senders.add(op.senders[0]);
      summary.recipients.add(op.recipients[0]);
      return {
        ...summary,
        in: op.type === "IN" ? summary.in.plus(op.value) : summary.in,
        out: op.type === "OUT" ? summary.out.plus(op.value) : summary.out,
      };
    },
    {
      in: new BigNumber(0),
      out: new BigNumber(0),
      senders: new Set<string>(),
      recipients: new Set<string>(),
    }
  );

  const txHash = txDetails.info.signature;

  // TODO: might not be accurate
  const isFeePayer =
    txDetails.parsed.transaction.message.accountKeys[0].pubkey.toBase58() ===
    accountAddress;
  // TODO: check if signer is account address

  const fee = new BigNumber(isFeePayer ? txDetails.parsed.meta?.fee ?? 0 : 0);

  const totalDelta = transferSummary.in.minus(transferSummary.out).minus(fee);

  const transferDirection = totalDelta.lte(0) ? "OUT" : "IN";

  return {
    id: encodeOperationId(accountId, txHash, transferDirection),
    hash: txHash,
    accountId,
    date: new Date(blockTime * 1000),
    senders: [...transferSummary.senders],
    recipients: [...transferSummary.recipients],
    type: transferDirection,
    // TODO: double check if block height === slot here
    blockHeight: txDetails.info.slot,
    // TODO: aslo double check that
    blockHash: txDetails.parsed.transaction.message.recentBlockhash,
    extra: {},
    // fee is actually lamports _per_ signature, is it multiplied in meta.fee ?
    fee,
    subOperations: internalTransferOperations,
    //value: transferDirection === "OUT" ? txLamports.plus(fee) : txLamports,
    value: totalDelta.abs(),
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

  // TODO: move to broadcast ?
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
