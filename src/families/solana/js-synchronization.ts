import { makeScanAccounts, makeSync, mergeOps } from "../../bridge/jsHelpers";
import {
  Account,
  encodeAccountId,
  Operation,
  OperationType,
  TokenAccount,
  TokenCurrency,
} from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { getAccount, findAssociatedTokenAccountPubkey } from "./api";
import BigNumber from "bignumber.js";
import { TokenAccountInfo as OnChainTokenAccountInfo } from "./api/validators/accounts/token";

import { create } from "superstruct";
import { decodeTokenAccountId, emptyHistoryCache } from "../../account";
import { getTransactions, TransactionDescriptor } from "./api/web3";
import {
  findCryptoCurrencyById,
  findTokenByAddress,
  findTokenById,
  findTokenByTicker,
  getTokenById,
} from "@ledgerhq/cryptoassets";
import { encodeOperationId } from "../../operation";
import { parseQuiet } from "./api/program/parser";
import {
  Awaited,
  decodeAccountIdWithTokenAccountAddress,
  encodeAccountIdWithTokenAccountAddress,
} from "./logic";
import _, {
  compact,
  filter,
  groupBy,
  identity,
  includes,
  keyBy,
  reduce,
  sum,
  sumBy,
} from "lodash";
import { parseTokenAccountInfo } from "./api/account/parser";

import { reduceDefined } from "./utils";

//type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

type NonEmptyArray<T> = Array<T> & {
  0: T;
};

const isNonEmptyArray = <T>(arr: Array<T>): arr is NonEmptyArray<T> =>
  arr.length > 0;

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

  const knownOnChainTokenAccs = reduceDefined((tokenAcc) => {
    const parsedInfo = tokenAcc.account.data.parsed.info;
    const info = parseTokenAccountInfo(parsedInfo);
    return info instanceof Error ? undefined : { tokenAcc, info };
  }, onChaintokenAccounts).filter(({ info }) => {
    return (
      findTokenById(`solana/spl/${info.mint.toBase58()}`)?.type ===
      "TokenCurrency"
    );
  });

  const knownOnChainTokenAccsByMint = new Map(
    Object.entries(
      groupBy(knownOnChainTokenAccs, (acc) => acc.info.mint.toString())
    )
  );

  // TODO: zip?
  const mintAddressSubAccountPairList =
    mainInitialAcc?.subAccounts
      ?.filter(
        (subAcc): subAcc is TokenAccount => subAcc.type === "TokenAccount"
      )
      .map((subAcc) => {
        const tokenIdParts = subAcc.token.id.split("/");
        const mintAddress = tokenIdParts[tokenIdParts.length - 1];
        return [mintAddress, subAcc] as const;
      }) ?? [];

  const subAccountByMintAddress = new Map(mintAddressSubAccountPairList);

  const perMintAsync = [...knownOnChainTokenAccsByMint.entries()].map(
    ([mintAddress, onChainTokenAccs]) => {
      const subAcc = subAccountByMintAddress.get(mintAddress);

      return toAsyncGenerator(async () => {
        const newTxsAsync = onChainTokenAccs.map((acc) =>
          getTransactions(
            acc.tokenAcc.pubkey.toBase58(),
            subAcc?.operations[0].hash
          )
        );
        const newTxs = await drainAsyncGen(...newTxsAsync);

        return {
          onChainTokenAccs,
          subAcc,
          newTxs,
        };
      });
    }
  );

  const perMint = await drainAsyncGen(...perMintAsync);

  const nextSubAccsAsync = perMint.map(
    ({ subAcc, onChainTokenAccs, newTxs }) => {
      return toAsyncGenerator(async () => {
        if (isNonEmptyArray(newTxs)) {
          if (subAcc === undefined) {
            const mintAddress = onChainTokenAccs[0].info.mint.toBase58();
            const ownerAddress = onChainTokenAccs[0].info.owner.toBase58();
            const associatedTokenAccPubkey =
              await findAssociatedTokenAccountPubkey(ownerAddress, mintAddress);
            const associatedTokenAccountExists = onChainTokenAccs.some((acc) =>
              acc.tokenAcc.pubkey.equals(associatedTokenAccPubkey)
            );
            return associatedTokenAccountExists
              ? newSubAcc(
                  mainAccountId,
                  onChainTokenAccs,
                  associatedTokenAccPubkey.toBase58(),
                  newTxs
                )
              : undefined;
          }
          return patchedSubAcc(subAcc, onChainTokenAccs, newTxs);
        }
        return subAcc;
      });
    }
  );

  //TODO: replacw with compact
  const nextSubAccs = reduceDefined(
    (v) => v,
    await drainAsyncGen(...nextSubAccsAsync)
  );

  const mainAccountLastTxSignature = mainInitialAcc?.operations[0]?.hash;

  const newMainAccTxs = await drainAsyncGen(
    getTransactions(mainAccAddress, mainAccountLastTxSignature)
  );

  const newMainAccOps = newMainAccTxs
    .map((tx) => txToMainAccOperation(tx, mainAccountId, mainAccAddress))
    .filter((op): op is Operation => op !== undefined);

  const mainAccTotalOperations = mergeOps(
    mainInitialAcc?.operations ?? [],
    newMainAccOps
  );

  const shape: Partial<Account> = {
    subAccounts: nextSubAccs,
    id: mainAccountId,
    blockHeight,
    balance: mainAccBalance,
    spendableBalance: mainAccSpendableBalance,
    operations: mainAccTotalOperations,
    operationsCount: mainAccTotalOperations.length,
  };

  return shape;
};

async function* enrichWithNewTransactions(
  accPairList: (readonly [
    OnChainTokenAccount,
    OnChainTokenAccountInfo,
    TokenAccount?
  ])[]
) {
  for (const [tokenAcc, info, subAcc] of accPairList) {
    const address = tokenAcc.pubkey.toBase58();
    const latestLoadedTxSignature = subAcc?.operations?.[0]?.hash;
    const accsWithTxs = [
      tokenAcc,
      info,
      subAcc,
      await drainAsyncGen(getTransactions(address, latestLoadedTxSignature)),
    ] as const;
    yield accsWithTxs;
  }
}

function parseTokenAccountInfoQuiet(info: any) {
  try {
    return create(info, OnChainTokenAccountInfo);
  } catch (e) {
    // TODO: remove throw
    throw e;
    console.error(e);
    return undefined;
  }
}

const postSync = (initial: Account, synced: Account) => {
  //const ops = (synced.subAccounts ?? []).flatMap(acc => acc.pen)
  return synced;
};

function toAsyncGenerator<T>(promise: () => Promise<T>) {
  return (async function* AsyncGenerator() {
    yield await promise();
  })();
}

async function drainAsyncGen<T>(...asyncGens: AsyncGenerator<T>[]) {
  const items: T[] = [];
  for (const gen of asyncGens) {
    for await (const item of gen) {
      items.push(item);
    }
  }
  return items;
}

function newSubAcc(
  mainAccId: string,
  onChainTokenAccs: NonEmptyArray<{
    tokenAcc: OnChainTokenAccount;
    info: OnChainTokenAccountInfo;
  }>,
  associatedTokenAccountAddress: string,
  txs: NonEmptyArray<TransactionDescriptor>
): TokenAccount {
  // TODO: check the order of txs
  const firstTx = txs[txs.length - 1];

  const creationDate = new Date(
    (firstTx.info.blockTime ?? Date.now() / 1000) * 1000
  );

  const tokenId = `solana/spl/${onChainTokenAccs[0].info.mint.toBase58()}`;
  const tokenCurrency = getTokenById(tokenId);

  const id = encodeAccountIdWithTokenAccountAddress(
    mainAccId,
    associatedTokenAccountAddress
  );

  const balance = new BigNumber(
    sumBy(onChainTokenAccs, (acc) => Number(acc.info.tokenAmount.amount))
  );

  const newOps = compact(
    txs.map((tx) => txToTokenAccOperation(tx, onChainTokenAccs, id))
  );

  return {
    balance,
    balanceHistoryCache: emptyHistoryCache,
    creationDate,
    id: id,
    parentId: mainAccId,
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

function patchedSubAcc(
  subAcc: TokenAccount,
  onChainTokenAccs: NonEmptyArray<{
    tokenAcc: OnChainTokenAccount;
    info: OnChainTokenAccountInfo;
  }>,
  txs: NonEmptyArray<TransactionDescriptor>
): TokenAccount {
  const balance = new BigNumber(
    sumBy(onChainTokenAccs, (acc) => Number(acc.info.tokenAmount.amount))
  );

  const owner = onChainTokenAccs[0].info.owner.toBase58();

  const newOps = compact(
    txs.map((tx) => txToTokenAccOperation(tx, onChainTokenAccs, subAcc.id))
  );

  const totalOps = mergeOps(subAcc.operations, newOps);
  return {
    ...subAcc,
    balance,
    spendableBalance: balance,
    operations: totalOps,
    operationsCount: totalOps.length,
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

  const { internalOperations, subOperations } = message.instructions.reduce(
    (acc, ix, ixIndex) => {
      const ixDescriptor = parseQuiet(ix, tx.parsed.transaction);
      const partialOp = ixDescriptorToPartialOperation(ixDescriptor);
      const op: Operation = {
        id: `${txHash}:ix:${ixIndex}`,
        hash: txHash,
        accountId,
        hasFailed: !!tx.info.err,
        blockHeight: tx.info.slot,
        blockHash: message.recentBlockhash,
        extra: {
          memo: tx.info.memo ?? undefined,
          info: JSON.stringify((ix as any).parsed?.info),
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
        // TODO: should we bother about sub operations at all?
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
  onChainTokenAccs: NonEmptyArray<{
    tokenAcc: OnChainTokenAccount;
    info: OnChainTokenAccountInfo;
  }>,
  accountId: string
): Operation | undefined {
  if (!tx.info.blockTime || !tx.parsed.meta) {
    return undefined;
  }

  const tokenAccIndices = [
    ...tx.parsed.transaction.message.accountKeys.entries(),
  ]
    .filter(([_, accKey]) =>
      onChainTokenAccs.some((acc) => acc.tokenAcc.pubkey.equals(accKey.pubkey))
    )
    .map(([index, _]) => index);

  const { preTokenBalances, postTokenBalances } = tx.parsed.meta;

  const tokenAccPreTokenBalances = (preTokenBalances ?? []).filter(
    (tokenBalance) => tokenAccIndices.includes(tokenBalance.accountIndex)
  );

  const tokenAccPostTokenBalances = (postTokenBalances ?? []).filter(
    (tokenBalance) => tokenAccIndices.includes(tokenBalance.accountIndex)
  );

  const delta =
    sum(
      tokenAccPostTokenBalances.map((value) =>
        Number(value.uiTokenAmount.amount)
      )
    ) -
    sum(
      tokenAccPreTokenBalances.map((value) =>
        Number(value.uiTokenAmount.amount)
      )
    );

  const txType = delta === 0 ? "NONE" : delta > 0 ? "IN" : "OUT";

  const txHash = tx.info.signature;

  const owner = onChainTokenAccs[0].info.owner.toBase58();

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
    value: new BigNumber(delta).abs(),
    hasFailed: !!tx.info.err,
    extra: {
      memo: tx.info.memo ?? undefined,
    },
    blockHash: tx.parsed.transaction.message.recentBlockhash,
  };
}

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

export const sync = makeSync(getAccountShape, postSync);
export const scanAccounts = makeScanAccounts(getAccountShape);
