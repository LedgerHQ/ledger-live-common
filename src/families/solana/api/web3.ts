import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  ConfirmedSignatureInfo,
  ParsedConfirmedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { chunk } from "lodash";
import { encodeOperationId } from "../../../operation";
import { Operation, OperationType } from "../../../types";
import {
  CreateAssociatedTokenAccountCommand,
  TokenTransferCommand,
  TransferCommand,
} from "../types";
import { parse } from "./program";
import { parseQuiet } from "./program/parser";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import {
  tryParseAsTokenAccount,
  parseTokenAccountInfo,
} from "./account/parser";
import { TokenAccountInfo } from "./validators/accounts/token";
import { drainSeqAsyncGen } from "../utils";
import { map } from "lodash/fp";
import { Awaited } from "../logic";

//const conn = new Connection(clusterApiUrl("mainnet-beta"), "finalized");
const conn = new Connection("http://api.devnet.solana.com");

export const getBalance = (address: string) =>
  conn.getBalance(new PublicKey(address));

/*
export const accountExists = async (address: string) => {
  return (await conn.getAccountInfo(new PublicKey(address))) !== null;
};
*/

export const getAccount = async (address: string) => {
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

export const getTxFeeCalculator = async () => {
  const res = await conn.getRecentBlockhash();
  return res.feeCalculator;
  //return res.feeCalculator.lamportsPerSignature;
};

//export const getNetworkInfo = async (): Promise<NetworkInfo> => {
export const getNetworkInfo = async (): Promise<{
  lamportsPerSignature: BigNumber;
}> => {
  const { feeCalculator } = await conn.getRecentBlockhash();

  return {
    lamportsPerSignature: new BigNumber(-1),
  };

  /*
  return {
    family: "solana",
    lamportsPerSignature: new BigNumber(feeCalculator.lamportsPerSignature),
  };
  */
};

function onChainTxToOperation(
  txDetails: TransactionDescriptor,
  mainAccountId: string,
  accountAddress: string
): Operation | undefined {
  if (!txDetails.info.blockTime) {
    return undefined;
  }

  if (!txDetails.parsed.meta) {
    return undefined;
  }

  const { message } = txDetails.parsed.transaction;

  const accountIndex = message.accountKeys.findIndex(
    (pma) => pma.pubkey.toBase58() === accountAddress
  );

  if (accountIndex < 0) {
    return undefined;
  }

  const { preBalances, postBalances } = txDetails.parsed.meta;

  const balanceDelta = new BigNumber(postBalances[accountIndex]).minus(
    new BigNumber(preBalances[accountIndex])
  );

  const isFeePayer =
    message.accountKeys[0].pubkey.toBase58() === accountAddress;

  const fee = new BigNumber(isFeePayer ? txDetails.parsed.meta.fee : 0);

  const txType: OperationType =
    isFeePayer && balanceDelta.eq(fee)
      ? "FEES"
      : balanceDelta.lt(0)
      ? "OUT"
      : balanceDelta.gt(0)
      ? "IN"
      : "NONE";

  const { senders, recipients } = message.accountKeys.reduce(
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

  const txHash = txDetails.info.signature;
  const txDate = new Date(txDetails.info.blockTime * 1000);

  const { internalOperations, subOperations } = message.instructions.reduce(
    (acc, ix, ixIndex) => {
      const ixDescriptor = parseQuiet(ix, txDetails.parsed.transaction);
      const partialOp = ixDescriptorToPartialOperation(ixDescriptor);
      //TODO: use encodeTokenAccountId here
      //const accountId = ixDescriptor.program === "spl-token" ? txd : "";
      const accountId = mainAccountId;
      const op: Operation = {
        id: `${txHash}:ix:${ixIndex}`,
        hash: txHash,
        accountId,
        hasFailed: !!txDetails.info.err,
        blockHeight: txDetails.info.slot,
        blockHash: message.recentBlockhash,
        extra: {
          memo: txDetails.info.memo ?? undefined,
          info: (ix as any).parsed?.info,
          //...partialOp.extra,
        },
        date: txDate,
        senders: [],
        recipients: [],
        fee: new BigNumber(0),
        value: partialOp.value ?? new BigNumber(0),
        type: partialOp.type ?? "NONE",
      };

      if (ixDescriptor.program === "spl-token") {
        acc.subOperations.push(op);
      } else {
        acc.internalOperations.push(op);
      }
      return acc;
    },
    {
      internalOperations: [] as Operation[],
      subOperations: [] as Operation[],
    }
  );

  return {
    id: encodeOperationId(mainAccountId, txHash, txType),
    hash: txHash,
    accountId: mainAccountId,
    hasFailed: !!txDetails.info.err,
    blockHeight: txDetails.info.slot,
    blockHash: message.recentBlockhash,
    extra: {
      memo: txDetails.info.memo ?? undefined,
    },
    type: txType,
    senders,
    recipients,
    date: txDate,
    value: balanceDelta.abs().minus(fee),
    internalOperations,
    subOperations,
    fee,
  };
}

export type TransactionDescriptor = {
  parsed: ParsedConfirmedTransaction;
  info: ConfirmedSignatureInfo;
};

async function* getTransactionsBatched(
  pubKey: PublicKey,
  untilTxSignature?: string
): AsyncGenerator<TransactionDescriptor[], void, unknown> {
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

async function* getTransactionsGen(address: string, untilTxSignature?: string) {
  const pubKey = new PublicKey(address);

  for await (const txDetailsBatch of getTransactionsBatched(
    pubKey,
    untilTxSignature
  )) {
    yield* txDetailsBatch;
  }
}

export function getTransactions(address: string, untilTxSignature?: string) {
  return drainSeqAsyncGen(getTransactionsGen(address, untilTxSignature));
}

// TODO: AMOUNT AS BIGNUMBER?
export const buildTransferTransaction = async ({
  sender,
  recipient,
  amount,
  memo,
}: TransferCommand) => {
  const fromPublicKey = new PublicKey(sender);
  const toPublicKey = new PublicKey(recipient);

  const { blockhash: recentBlockhash } = await conn.getRecentBlockhash();

  const onChainTx = new Transaction({
    feePayer: fromPublicKey,
    recentBlockhash,
  });

  const transferIx = SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    //lamports: amount.toNumber(),
    lamports: amount,
  });

  onChainTx.add(transferIx);

  if (memo) {
    const memoIx = new TransactionInstruction({
      keys: [],
      // TODO: switch to spl memo id
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(memo),
    });
    onChainTx.add(memoIx);
  }

  return onChainTx;
};

export const buildTokenTransferTransaction = async (
  command: TokenTransferCommand
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
      // TODO: switch to spl id
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

function ixDescriptorToPartialOperation(
  ixDescriptor: Exclude<ReturnType<typeof parse>, undefined>
): Partial<Operation> {
  const { info } = ixDescriptor.instruction ?? {};

  // TODO: fix poor man display
  /*
  const infoStrValues =
    info &&
    Object.keys(info).reduce((acc, key) => {
      acc[key] = info[key].toString();
      return acc;
    }, {});
  */

  const extra = {
    program: ixDescriptor.title,
    instruction: ixDescriptor.instruction?.title,
    //info: JSON.stringify(infoStrValues, null, 2),
  };

  return {
    type: "NONE",
    extra,
  };
}

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
  mintAddress: string
) {
  const ownerPubkey = new PublicKey(ownerAddress);
  const mintPubkey = new PublicKey(mintAddress);

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
export async function getMaybeTokenAccount(address: string) {
  const accInfo = (await conn.getParsedAccountInfo(new PublicKey(address)))
    .value;

  const tokenAccount =
    accInfo !== null && "parsed" in accInfo.data
      ? tryParseAsTokenAccount(accInfo.data)
      : undefined;

  return tokenAccount;
}

export async function buildCreateAssociatedTokenAccountTransaction({
  mint,
  owner,
  associatedTokenAccountAddress,
}: CreateAssociatedTokenAccountCommand): Promise<Transaction> {
  const ownerPubKey = new PublicKey(owner);
  const mintPubkey = new PublicKey(mint);
  const associatedTokenAccPubkey = new PublicKey(associatedTokenAccountAddress);

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

export function getAssociatedTokenAccountCreationFee() {
  return Token.getMinBalanceRentForExemptAccount(conn);
}
