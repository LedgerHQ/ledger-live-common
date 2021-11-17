import { makeScanAccounts, makeSync, mergeOps } from "../../bridge/jsHelpers";
import {
  Account,
  encodeAccountId,
  Operation,
  OperationType,
  TokenAccount,
} from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { getAccount, findAssociatedTokenAccountPubkey } from "./api";
import BigNumber from "bignumber.js";

import { emptyHistoryCache } from "../../account";
import { getTransactions, TransactionDescriptor } from "./api/web3";
import { getTokenById } from "@ledgerhq/cryptoassets";
import { encodeOperationId } from "../../operation";
import {
  Awaited,
  encodeAccountIdWithTokenAccountAddress,
  tokenIsListedOnLedger,
  toTokenId,
  toTokenMint,
} from "./logic";
import _, { compact, filter, groupBy, keyBy, toPairs, pipe } from "lodash/fp";

type OnChainTokenAccount = Awaited<
  ReturnType<typeof getAccount>
>["tokenAccounts"][number];

const getAccountShape: GetAccountShape = async (info) => {
  const {
    address: mainAccAddress,
    initialAccount: mainInitialAcc,
    currency,
    derivationMode,
  } = info;
  const {
    //TODO: switch to slot?
    blockHeight,
    balance: mainAccBalance,
    spendableBalance: mainAccSpendableBalance,
    tokenAccounts: onChaintokenAccounts,
  } = await getAccount(mainAccAddress);

  const mainAccountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: mainAccAddress,
    derivationMode,
  });

  const onChainTokenAccsByMint = pipe(
    () => onChaintokenAccounts,
    groupBy(({ info: { mint } }) => mint.toBase58()),
    (v) => new Map(toPairs(v))
  )();

  const subAccByMint = pipe(
    () => mainInitialAcc?.subAccounts ?? [],
    filter((subAcc): subAcc is TokenAccount => subAcc.type === "TokenAccount"),
    keyBy((subAcc) => toTokenMint(subAcc.token.id)),
    (v) => new Map(toPairs(v))
  )();

  const nextSubAccs2: TokenAccount[] = [];

  for (const [mint, accs] of onChainTokenAccsByMint.entries()) {
    if (!tokenIsListedOnLedger(mint)) {
      continue;
    }

    const assocTokenAccPubkey = await findAssociatedTokenAccountPubkey(
      mainAccAddress,
      mint
    );

    const assocTokenAcc = accs.find(({ onChainAcc: { pubkey } }) =>
      pubkey.equals(assocTokenAccPubkey)
    );

    if (assocTokenAcc === undefined) {
      continue;
    }

    const subAcc = subAccByMint.get(mint);

    const lastSyncedTxSignature = subAcc?.operations?.[0].hash;

    const txs = await getTransactions(
      assocTokenAcc.onChainAcc.pubkey.toBase58(),
      lastSyncedTxSignature
    );

    const nextSubAcc =
      subAcc === undefined
        ? newSubAcc({
            mainAccountId,
            assocTokenAcc,
            txs,
          })
        : patchedSubAcc({
            subAcc,
            assocTokenAcc,
            txs,
          });

    nextSubAccs2.push(nextSubAcc);
  }

  const mainAccountLastTxSignature = mainInitialAcc?.operations[0]?.hash;

  const newMainAccTxs = await getTransactions(
    mainAccAddress,
    mainAccountLastTxSignature
  );

  const newMainAccOps = newMainAccTxs
    .map((tx) => txToMainAccOperation(tx, mainAccountId, mainAccAddress))
    .filter((op): op is Operation => op !== undefined);

  const mainAccTotalOperations = mergeOps(
    mainInitialAcc?.operations ?? [],
    newMainAccOps
  );

  const shape: Partial<Account> = {
    subAccounts: nextSubAccs2,
    id: mainAccountId,
    blockHeight,
    balance: mainAccBalance,
    spendableBalance: mainAccSpendableBalance,
    operations: mainAccTotalOperations,
    operationsCount: mainAccTotalOperations.length,
  };

  return shape;
};

const postSync = (initial: Account, synced: Account) => {
  return synced;
};

function newSubAcc({
  mainAccountId,
  assocTokenAcc,
  txs,
}: {
  mainAccountId: string;
  assocTokenAcc: OnChainTokenAccount;
  txs: TransactionDescriptor[];
}): TokenAccount {
  // TODO: check the order of txs
  const firstTx = txs[txs.length - 1];

  const creationDate = new Date(
    (firstTx.info.blockTime ?? Date.now() / 1000) * 1000
  );

  const tokenId = toTokenId(assocTokenAcc.info.mint.toBase58());
  const tokenCurrency = getTokenById(tokenId);

  const accosTokenAccPubkey = assocTokenAcc.onChainAcc.pubkey;

  const accountId = encodeAccountIdWithTokenAccountAddress(
    mainAccountId,
    accosTokenAccPubkey.toBase58()
  );

  const balance = new BigNumber(assocTokenAcc.info.tokenAmount.amount);

  const newOps = compact(
    txs.map((tx) => txToTokenAccOperation(tx, assocTokenAcc, accountId))
  );

  return {
    balance,
    balanceHistoryCache: emptyHistoryCache,
    creationDate,
    id: accountId,
    parentId: mainAccountId,
    operations: mergeOps([], newOps),
    // TODO: fix
    operationsCount: txs.length,
    pendingOperations: [],
    spendableBalance: balance,
    starred: false,
    swapHistory: [],
    token: tokenCurrency,
    type: "TokenAccount",
  };
}

function patchedSubAcc({
  subAcc,
  assocTokenAcc,
  txs,
}: {
  subAcc: TokenAccount;
  assocTokenAcc: OnChainTokenAccount;
  txs: TransactionDescriptor[];
}): TokenAccount {
  const balance = new BigNumber(assocTokenAcc.info.tokenAmount.amount);

  const newOps = compact(
    txs.map((tx) => txToTokenAccOperation(tx, assocTokenAcc, subAcc.id))
  );

  const totalOps = mergeOps(subAcc.operations, newOps);

  return {
    ...subAcc,
    balance,
    spendableBalance: balance,
    operations: totalOps,
  };
}

function txToMainAccOperation(
  tx: TransactionDescriptor,
  accountId: string,
  accountAddress: string
): Operation | undefined {
  if (!tx.info.blockTime || !tx.parsed.meta) {
    return undefined;
  }

  const { message } = tx.parsed.transaction;

  const accountIndex = message.accountKeys.findIndex(
    (pma) => pma.pubkey.toBase58() === accountAddress
  );

  if (accountIndex < 0) {
    return undefined;
  }

  const { preBalances, postBalances } = tx.parsed.meta;

  const balanceDelta = new BigNumber(postBalances[accountIndex]).minus(
    new BigNumber(preBalances[accountIndex])
  );

  const isFeePayer =
    message.accountKeys[0].pubkey.toBase58() === accountAddress;

  const fee = new BigNumber(isFeePayer ? tx.parsed.meta.fee : 0);

  const txType: OperationType =
    isFeePayer && balanceDelta.negated().eq(fee)
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

  const txHash = tx.info.signature;
  const txDate = new Date(tx.info.blockTime * 1000);

  return {
    id: encodeOperationId(accountId, txHash, txType),
    hash: txHash,
    accountId: accountId,
    hasFailed: !!tx.info.err,
    blockHeight: tx.info.slot,
    blockHash: message.recentBlockhash,
    extra: {
      memo: tx.info.memo ?? undefined,
    },
    type: txType,
    senders,
    recipients,
    date: txDate,
    value: balanceDelta.abs().minus(fee),
    //internalOperations,
    //subOperations,
    fee,
  };
}

function txToTokenAccOperation(
  tx: TransactionDescriptor,
  assocTokenAcc: OnChainTokenAccount,
  accountId: string
): Operation | undefined {
  if (!tx.info.blockTime || !tx.parsed.meta) {
    return undefined;
  }

  const assocTokenAccIndex =
    tx.parsed.transaction.message.accountKeys.findIndex((v) =>
      v.pubkey.equals(assocTokenAcc.onChainAcc.pubkey)
    );

  if (assocTokenAccIndex < 0) {
    return undefined;
  }

  const { preTokenBalances, postTokenBalances } = tx.parsed.meta;

  const preTokenBalance = preTokenBalances?.find(
    (b) => b.accountIndex === assocTokenAccIndex
  );

  const postTokenBalance = postTokenBalances?.find(
    (b) => b.accountIndex === assocTokenAccIndex
  );

  const delta = new BigNumber(
    postTokenBalance?.uiTokenAmount.amount ?? 0
  ).minus(new BigNumber(preTokenBalance?.uiTokenAmount.amount ?? 0));

  const txType = delta.eq(0) ? "NONE" : delta.gt(0) ? "IN" : "OUT";

  const txHash = tx.info.signature;

  const owner = assocTokenAcc.info.owner.toBase58();

  return {
    id: encodeOperationId(accountId, txHash, txType),
    accountId,
    type: txType,
    hash: txHash,
    date: new Date(tx.info.blockTime * 1000),
    blockHeight: tx.info.slot,
    // TODO: fix
    fee: new BigNumber(0),
    recipients: [owner],
    // TODO: fix
    senders: [],
    value: delta.abs(),
    hasFailed: !!tx.info.err,
    extra: {
      memo: tx.info.memo ?? undefined,
    },
    blockHash: tx.parsed.transaction.message.recentBlockhash,
  };
}

/*
function ixDescriptorToPartialOperation(
  ixDescriptor: Exclude<ReturnType<typeof parseQuiet>, undefined>
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
*/

export const sync = makeSync(getAccountShape, postSync);
export const scanAccounts = makeScanAccounts(getAccountShape);
