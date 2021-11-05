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
import { chunk, sortBy } from "lodash";
import { encodeOperationId } from "../../../operation";
import { Operation, OperationType } from "../../../types";
import { NetworkInfo } from "../types";
import { parse } from "./program";
import { parseQuiet } from "./program/parser";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import { parseTokenAccountInfo } from "./account/parser";
import { TokenAccountInfo } from "./validators/accounts/token";

//const conn = new Connection(clusterApiUrl("mainnet-beta"), "finalized");
const conn = new Connection("http://api.devnet.solana.com");

export const getBalance = (address: string) =>
  conn.getBalance(new PublicKey(address));

export const getAccount = async (address: string) => {
  const pubKey = new PublicKey(address);

  const [balanceLamportsWithContext, lamportPerSignature, tokenAccounts] =
    await Promise.all([
      conn.getBalanceAndContext(pubKey),
      getNetworkInfo().then((res) => res.lamportsPerSignature),
      conn.getParsedTokenAccountsByOwner(pubKey, {
        programId: TOKEN_PROGRAM_ID,
      }),
    ]);

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

export const getNetworkInfo = async (): Promise<NetworkInfo> => {
  const { feeCalculator } = await conn.getRecentBlockhash();

  return {
    family: "solana",
    lamportsPerSignature: new BigNumber(feeCalculator.lamportsPerSignature),
  };
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

export async function* getTransactions(
  address: string,
  untilTxSignature?: string
) {
  const pubKey = new PublicKey(address);

  for await (const txDetailsBatch of getTransactionsBatched(
    pubKey,
    untilTxSignature
  )) {
    yield* txDetailsBatch;
  }
}

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

// TODO: ancillary accs and gc!
export const buildTokenTransferTransaction = async ({
  fromAddress,
  mintAddress,
  toAddress,
  amount,
  decimals,
  memo,
}: {
  fromAddress: string;
  mintAddress: string;
  toAddress: string;
  amount: BigNumber;
  decimals: number;
  memo?: string;
}) => {
  const fromPubkey = new PublicKey(fromAddress);
  const mintPubkey = new PublicKey(mintAddress);

  const fromAssociatedTokenAddress = await findAssociatedTokenAddress(
    fromAddress,
    mintAddress
  );
  const fromAssociatedTokenPubKey = new PublicKey(fromAssociatedTokenAddress);

  const toAssociatedTokenAddress = await findAssociatedTokenAddress(
    toAddress,
    mintAddress
  );

  const toAssociatedTokenPubKey = new PublicKey(toAssociatedTokenAddress);

  const { blockhash: recentBlockhash } = await conn.getRecentBlockhash();

  const onChainTx = new Transaction({
    feePayer: fromPubkey,
    recentBlockhash,
  });

  const tokenTransferIx = Token.createTransferCheckedInstruction(
    TOKEN_PROGRAM_ID,
    fromAssociatedTokenPubKey,
    mintPubkey,
    toAssociatedTokenPubKey,
    fromPubkey,
    [],
    amount.toNumber(),
    decimals
  );

  onChainTx.add(tokenTransferIx);

  if (memo) {
    const memoIx = new TransactionInstruction({
      //keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: false }],
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

export async function isTokenAccount(address: string) {
  const accountInfo = await conn.getAccountInfo(new PublicKey(address));

  return accountInfo?.owner;
}

export async function findAssociatedTokenAddress(
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

export async function estimateTokenSpendableBalance(
  ownerAddress: string,
  mintAddress: string,
  destAddress?: string
): Promise<BigNumber> {
  const ownerPubkey = new PublicKey(ownerAddress);
  const mintPubkey = new PublicKey(mintAddress);
  const destPubkey =
    destAddress === undefined ? PublicKey.default : new PublicKey(destAddress);

  const tokenAccs = await getTokenAccountsByMint(ownerAddress, mintAddress);

  const sourceableTokenAccs = sortBy(
    tokenAccs.filter((acc) => {
      return (
        acc.tokenAccInfo.state === "initialized" &&
        acc.tokenAccInfo.tokenAmount.amount !== "0"
      );
    }),
    (info) => -Number(info.tokenAccInfo.tokenAmount.amount)
  );

  // simulation data should be as real as possible
  const { blockhash } = await conn.getRecentBlockhash();

  const dummyTx = new Transaction({
    feePayer: ownerPubkey,
    recentBlockhash: blockhash,
  });

  const { transferableAmount } = sourceableTokenAccs.reduce(
    (accum, acc) => {
      if (accum.overflow) {
        return accum;
      }

      try {
        const tokenAmount = Number(acc.tokenAccInfo.tokenAmount.amount);
        const nextTx = accum.tx.add(
          Token.createTransferCheckedInstruction(
            TOKEN_PROGRAM_ID,
            acc.info.pubkey,
            mintPubkey,
            destPubkey,
            ownerPubkey,
            [],
            tokenAmount,
            acc.tokenAccInfo.tokenAmount.decimals
          )
        );
        const _ = accum.tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        return {
          ...accum,
          tx: nextTx,
          transferableAmount: accum.transferableAmount + tokenAmount,
          overflow: false,
        };
      } catch (e) {
        // expected throw if tx is too large
        return {
          ...accum,
          overflow: true,
        };
      }
    },
    {
      tx: dummyTx,
      transferableAmount: 0,
      overflow: false,
    }
  );

  return new BigNumber(transferableAmount);
}

async function getTokenAccountsByMint(
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
