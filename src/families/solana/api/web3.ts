import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  ConfirmedSignatureInfo,
  ParsedConfirmedTransaction,
  TransactionInstruction,
  Cluster,
  clusterApiUrl,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { chunk } from "lodash";
import {
  TokenCreateATACommand,
  TokenTransferCommand,
  TransferCommand,
} from "../types";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import { tryParseAsTokenAccount, parseTokenAccountInfo } from "./account";
import { TokenAccountInfo } from "./account/token";
import { drainSeqAsyncGen } from "../utils";
import { map } from "lodash/fp";
import { Awaited } from "../logic";

export type Config = {
  cluster: Cluster;
};

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

const connector = () => {
  const connections = new Map<Cluster, Connection>();

  return (cluster: Cluster) => {
    const existingConnection = connections.get(cluster);
    if (existingConnection !== undefined) {
      return existingConnection;
    }
    const newConnection = new Connection(clusterApiUrl(cluster));
    connections.set(cluster, newConnection);
    return newConnection;
  };
};

const connection = connector();

export const getBalance = (address: string, config: Config) =>
  connection(config.cluster).getBalance(new PublicKey(address));

export const getAccount = async (address: string, config: Config) => {
  const conn = connection(config.cluster);

  const pubKey = new PublicKey(address);
  const balanceLamportsWithContext = await conn.getBalanceAndContext(pubKey);

  const lamportPerSignature = await conn
    .getRecentBlockhash()
    .then((res) => res.feeCalculator.lamportsPerSignature);

  const tokenAccounts = await conn
    .getParsedTokenAccountsByOwner(pubKey, {
      programId: TOKEN_PROGRAM_ID,
    })
    .then((res) => res.value)
    .then(map(toTokenAccountWithInfo));

  const balance = new BigNumber(balanceLamportsWithContext.value);
  const spendableBalance = BigNumber.max(balance.minus(lamportPerSignature), 0);
  // TODO: check that
  const blockHeight = balanceLamportsWithContext.context.slot;

  return {
    tokenAccounts,
    balance,
    spendableBalance,
    blockHeight,
  };
};

type ParsedOnChainTokenAccount = Awaited<
  ReturnType<Connection["getParsedTokenAccountsByOwner"]>
>["value"][number];

function toTokenAccountWithInfo(onChainAcc: ParsedOnChainTokenAccount) {
  const parsedInfo = onChainAcc.account.data.parsed.info;
  const info = parseTokenAccountInfo(parsedInfo);
  return { onChainAcc, info };
}

export const getTxFeeCalculator = async (config: Config) => {
  const res = await connection(config.cluster).getRecentBlockhash();
  return res.feeCalculator;
};

export type TransactionDescriptor = {
  parsed: ParsedConfirmedTransaction;
  info: ConfirmedSignatureInfo;
};

async function* getTransactionsBatched(
  pubKey: PublicKey,
  untilTxSignature: string | undefined,
  config: Config
): AsyncGenerator<TransactionDescriptor[], void, unknown> {
  const conn = connection(config.cluster);
  // as per Ledger team - last 1000 operations is a sane limit
  const signatures = await conn.getSignaturesForAddress(pubKey, {
    until: untilTxSignature,
    limit: 1000,
  });

  // max req payload is 50K, around 200 transactions atm
  // requesting 100 at a time to give some space for payload to change in future
  const batchSize = 100;

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
    }, [] as TransactionDescriptor[]);

    yield txsDetails;
  }
}

async function* getTransactionsGen(
  address: string,
  untilTxSignature: string | undefined,
  config: Config
) {
  const pubKey = new PublicKey(address);

  for await (const txDetailsBatch of getTransactionsBatched(
    pubKey,
    untilTxSignature,
    config
  )) {
    yield* txDetailsBatch;
  }
}

export function getTransactions(
  address: string,
  untilTxSignature: string | undefined,
  config: Config
) {
  return drainSeqAsyncGen(
    getTransactionsGen(address, untilTxSignature, config)
  );
}

export const buildTransferTransaction = async (
  { sender, recipient, amount, memo }: TransferCommand,
  config: Config
) => {
  const fromPublicKey = new PublicKey(sender);
  const toPublicKey = new PublicKey(recipient);

  const conn = connection(config.cluster);

  const { blockhash: recentBlockhash } = await conn.getRecentBlockhash();

  const onChainTx = new Transaction({
    feePayer: fromPublicKey,
    recentBlockhash,
  });

  const transferIx = SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports: amount,
  });

  onChainTx.add(transferIx);

  if (memo) {
    const memoIx = new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(memo),
    });
    onChainTx.add(memoIx);
  }

  return onChainTx;
};

export const buildTokenTransferTransaction = async (
  command: TokenTransferCommand,
  config: Config
) => {
  const {
    ownerAddress,
    ownerAssociatedTokenAccountAddress,
    amount,
    recipientDescriptor,
    mintAddress,
    mintDecimals,
    memo,
  } = command;
  const conn = connection(config.cluster);

  const { blockhash: recentBlockhash } = await conn.getRecentBlockhash();

  const ownerPubkey = new PublicKey(ownerAddress);

  const destinationPubkey = new PublicKey(recipientDescriptor.tokenAccAddress);

  const onChainTx = new Transaction({
    feePayer: ownerPubkey,
    recentBlockhash,
  });

  const mintPubkey = new PublicKey(mintAddress);

  if (recipientDescriptor.shouldCreateAsAssociatedTokenAccount) {
    onChainTx.add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintPubkey,
        destinationPubkey,
        new PublicKey(recipientDescriptor.walletAddress),
        ownerPubkey
      )
    );
  }

  const tokenTransferIx = Token.createTransferCheckedInstruction(
    TOKEN_PROGRAM_ID,
    new PublicKey(ownerAssociatedTokenAccountAddress),
    mintPubkey,
    destinationPubkey,
    ownerPubkey,
    [],
    amount,
    mintDecimals
  );

  onChainTx.add(tokenTransferIx);

  if (memo) {
    const memoIx = new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
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

export const broadcastTransaction = (rawTx: Buffer, config: Config) => {
  return connection(config.cluster).sendRawTransaction(rawTx);
};

export async function findAssociatedTokenAccountPubkey(
  ownerAddress: string,
  mintAddress: string
) {
  const ownerPubKey = new PublicKey(ownerAddress);
  const mintPubkey = new PublicKey(mintAddress);

  return Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintPubkey,
    ownerPubKey
  );
}

export async function getOnChainTokenAccountsByMint(
  ownerAddress: string,
  mintAddress: string,
  config: Config
) {
  const ownerPubkey = new PublicKey(ownerAddress);
  const mintPubkey = new PublicKey(mintAddress);

  const conn = connection(config.cluster);

  const { value: onChainTokenAccInfoList } =
    await conn.getParsedTokenAccountsByOwner(ownerPubkey, {
      mint: mintPubkey,
    });

  type Info = {
    info: typeof onChainTokenAccInfoList[number];
    tokenAccInfo: TokenAccountInfo;
  };

  return onChainTokenAccInfoList
    .map((info) => {
      const parsedInfo = info.account.data.parsed?.info;
      const tokenAccInfo = parseTokenAccountInfo(parsedInfo);

      return tokenAccInfo instanceof Error
        ? undefined
        : {
            info: info,
            tokenAccInfo,
          };
    })
    .filter((value): value is Info => value !== undefined);
}
export async function getMaybeTokenAccount(
  address: string,
  config: {
    cluster: Cluster;
  }
) {
  const conn = connection(config.cluster);

  const accInfo = (await conn.getParsedAccountInfo(new PublicKey(address)))
    .value;

  const tokenAccount =
    accInfo !== null && "parsed" in accInfo.data
      ? tryParseAsTokenAccount(accInfo.data)
      : undefined;

  return tokenAccount;
}

export async function buildCreateAssociatedTokenAccountTransaction(
  { mint, owner, associatedTokenAccountAddress }: TokenCreateATACommand,
  config: Config
): Promise<Transaction> {
  const ownerPubKey = new PublicKey(owner);
  const mintPubkey = new PublicKey(mint);
  const associatedTokenAccPubkey = new PublicKey(associatedTokenAccountAddress);

  const conn = connection(config.cluster);

  const { blockhash: recentBlockhash } = await conn.getRecentBlockhash();

  const onChainTx = new Transaction({
    feePayer: ownerPubKey,
    recentBlockhash,
  });

  onChainTx.add(
    Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      associatedTokenAccPubkey,
      ownerPubKey,
      ownerPubKey
    )
  );

  return onChainTx;
}

export function getAssociatedTokenAccountCreationFee(config: Config) {
  return Token.getMinBalanceRentForExemptAccount(connection(config.cluster));
}
