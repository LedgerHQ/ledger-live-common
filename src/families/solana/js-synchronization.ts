import { makeScanAccounts, makeSync, mergeOps } from "../../bridge/jsHelpers";
import {
  Account,
  CryptoCurrency,
  encodeAccountId,
  encodeTokenAccountId,
  Operation,
  OperationType,
  SubAccount,
  TokenAccount,
  TokenCurrency,
} from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { getAccount } from "./api";
import BigNumber from "bignumber.js";
import { TokenAccountInfo } from "./api/validators/accounts/token";

import { create } from "superstruct";
import {
  decodeAccountId,
  decodeTokenAccountId,
  emptyHistoryCache,
} from "../../account";
import { getTransactions, TransactionDescriptor } from "./api/web3";
import {
  findCryptoCurrencyById,
  getCryptoCurrencyById,
} from "@ledgerhq/cryptoassets";
import { encodeOperationId } from "../../operation";
import { parseQuiet } from "./api/program/parser";

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

type NonEmptyArray<T> = Array<T> & {
  0: T;
};

const isNonEmptyArray = <T>(arr: Array<T>): arr is NonEmptyArray<T> =>
  arr.length > 0;

type OnChainTokenAccount = Awaited<
  ReturnType<typeof getAccount>
>["tokenAccounts"]["value"][number];

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
    tokenAccounts,
  } = await getAccount(mainAccAddress);

  const mainAccountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: mainAccAddress,
    derivationMode,
  });

  const addressSubAccountPairList =
    mainInitialAcc?.subAccounts
      ?.filter(
        (subAcc): subAcc is TokenAccount => subAcc.type === "TokenAccount"
      )
      .map((subAcc) => {
        const { accountId: accountIdWithTokenAccountAddress } =
          decodeTokenAccountId(subAcc.id);
        const { address } = decodeAccountIdWithTokenAccountAddress(
          accountIdWithTokenAccountAddress
        );
        return [address, subAcc] as const;
      }) ?? [];

  const subAccountByAddress = new Map(addressSubAccountPairList);

  const tokenAccSubAccPairList = tokenAccounts.value.map((tokenAcc) => {
    return [
      tokenAcc,
      subAccountByAddress.get(tokenAcc.pubkey.toBase58()),
    ] as const;
  });

  const tokenAccSubAccNewTxsList = await drainAsyncGen(
    enrichWithNewTransactions(tokenAccSubAccPairList)
  );

  const nextSubAccs = tokenAccSubAccNewTxsList
    .map(([tokenAcc, subAcc, newTxs]) => {
      if (isNonEmptyArray(newTxs)) {
        const parsedInfo = tokenAcc.account.data.parsed.info;
        const tokenAccInfo = parseTokenAccountInfoQuiet(parsedInfo);

        // if parsing failed, skip
        if (tokenAccInfo !== undefined) {
          return subAcc === undefined
            ? newSubAcc(mainAccountId, tokenAcc, tokenAccInfo, newTxs)
            : patchedSubAcc(subAcc, tokenAccInfo, newTxs);
        }
      } else if (subAcc === undefined) {
        // TODO: remove, should never happen though
        throw new Error(
          "unexpected combination of undefined subAcc and empty new txs"
        );
      }

      return subAcc;
    })
    .filter((subAcc): subAcc is TokenAccount => subAcc !== undefined);

  const mainAccountLastTxSignature = mainInitialAcc?.operations[0]?.hash;

  /*
  const addressNewOperationsPairList = await tokenAccounts.value
    .map((tacc) => {
      const address = tacc.pubkey.toBase58();
      const lastTxSignature =
        subAccountByAddress.get(address)?.operations[0]?.hash;
      return [address, lastTxSignature] as const;
    })
    .concat([mainAccAddress, mainAccountLastTxSignature])
    .reduce(async (asyncAccum, [address, lastTxSignature]) => {
      const accum = await asyncAccum;
      await getOperations(address, lastTxSignature);
      return accum;
    }, Promise.resolve([] as [string, Operation[]][]));
    */

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

  /*
  const newTokenAccountOperations = newOperations
    .flatMap((op) => op.subOperations ?? [])
    .reduce((acc, subOp) => {
      // TODO: that should be!
      //const { token } = decodeTokenAccountId(op.id);
      const subOps = acc.get(subOp.accountId) ?? [];
      subOps.push(subOp);
      acc.set(subOp.accountId, subOps);
      return acc;
    }, new Map<string, Operation[]>());
    */

  /*
  const subAccounts = tokenAccounts.value.reduce((acc, accountInfo) => {
    const parsedInfo = accountInfo.account.data.parsed.info;
    const info = parseTokenAccountInfoQuiet(parsedInfo);

    if (info) {
      // TODO: fetch actual token info
      const tokenCurrency = fakeTokenCurrency(currency, info);
      const tokenAccount: TokenAccount = {
        type: "TokenAccount",
        parentId: mainAccountId,
        id: encodeTokenAccountId(mainAccountId, tokenCurrency),
        token: tokenCurrency,
        // TODO check that
        balance: new BigNumber(info.tokenAmount.uiAmountString),
        balanceHistoryCache: emptyHistoryCache,
        // TODO: fix
        creationDate: new Date(),
        // TODO: deduce from 'getOperations'?
        operations: [],
        // TODO: deduce from 'getOperations'?
        operationsCount: 0,
        pendingOperations: [],
        // TODO: fix
        spendableBalance: new BigNumber(info.tokenAmount.uiAmountString),
      };
      acc.push(tokenAccount);
    }
    return acc;
  }, [] as TokenAccount[]);

  const operations = mergeOps(oldOperations, newOperations);
  */

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
  accPairList: (readonly [OnChainTokenAccount, TokenAccount?])[]
) {
  for (const [tokenAcc, subAcc] of accPairList) {
    const address = tokenAcc.pubkey.toBase58();
    console.log("token acc address", address);
    const latestLoadedTxSignature = subAcc?.operations?.[0]?.hash;
    const accsWithTxs = [
      tokenAcc,
      subAcc,
      await drainAsyncGen(getTransactions(address, latestLoadedTxSignature)),
    ] as const;
    yield accsWithTxs;
  }
}

function parseTokenAccountInfoQuiet(info: any) {
  try {
    return create(info, TokenAccountInfo);
  } catch (e) {
    // TODO: remove throw
    throw e;
    console.error(e);
    return undefined;
  }
}

const postSync = (initial: Account, parent: Account) => {
  return parent;
};

const fakeTokenCurrency = (info?: TokenAccountInfo): TokenCurrency => {
  const parentCurrency = findCryptoCurrencyById("solana");
  if (!parentCurrency) {
    throw new Error("solana crypto currency not found");
  }
  return {
    // TODO: check that
    contractAddress: info?.owner.toBase58() ?? "some contract address",
    parentCurrency,
    id: info?.mint.toBase58() ?? "some id here",
    // TODO: fix
    name: "N/A",
    // TODO: fix
    ticker: "N/A",
    tokenType: "spl-token",
    type: "TokenCurrency",
    // TODO: fix
    units: [
      { code: "N/A", magnitude: info?.tokenAmount.decimals || 0, name: "N/A" },
      { code: "N/A", magnitude: 0, name: "N/A" },
    ],
  };
};

function encodeAccountIdWithTokenAccountAddress(
  accountId: string,
  address: string
) {
  return `${accountId}+${address}`;
}

function decodeAccountIdWithTokenAccountAddress(
  accountIdWithTokenAccountAddress: string
) {
  const lastColonIndex = accountIdWithTokenAccountAddress.lastIndexOf("+");
  return {
    accountId: accountIdWithTokenAccountAddress.slice(0, lastColonIndex),
    address: accountIdWithTokenAccountAddress.slice(lastColonIndex + 1),
  };
}

async function drainAsyncGen<T>(asyncGen: AsyncGenerator<T>) {
  const items: T[] = [];
  for await (const item of asyncGen) {
    items.push(item);
  }
  return items;
}

function newSubAcc(
  mainAccId: string,
  tokenAcc: OnChainTokenAccount,
  tokenAccInfo: TokenAccountInfo,
  txs: NonEmptyArray<TransactionDescriptor>
): TokenAccount {
  // TODO: check the order of txs
  const firstTx = txs[txs.length - 1];
  // best effort
  const creationDate = new Date(
    (firstTx.info.blockTime ?? Date.now() / 1000) * 1000
  );

  // TODO: fix
  const tokenCurrency = fakeTokenCurrency(tokenAccInfo);

  const id = encodeAccountIdWithTokenAccountAddress(
    mainAccId,
    tokenAcc.pubkey.toBase58()
  );

  const balance = new BigNumber(tokenAccInfo.tokenAmount.uiAmountString);
  return {
    balance,
    balanceHistoryCache: emptyHistoryCache,
    creationDate,
    id: id,
    parentId: mainAccId,
    // TODO: map txs to token acc operations
    operations: mergeOps(
      [],
      txs.map((tx) => txToTokenAccOperation(tx, id))
    ),
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
  tokenAccInfo: TokenAccountInfo,
  txs: NonEmptyArray<TransactionDescriptor>
): TokenAccount {
  const balance = new BigNumber(tokenAccInfo.tokenAmount.uiAmountString);
  const newOps = txs.map((tx) => txToTokenAccOperation(tx, subAcc.id));
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
    internalOperations,
    subOperations,
    fee,
  };
}

function txToTokenAccOperation(
  tx: TransactionDescriptor,
  accountId: string
): Operation {
  const hash = tx.info.signature;
  // TODO: fix
  const type = "IN";
  return {
    id: encodeOperationId(accountId, hash, type),
    accountId,
    type,
    hash,
    date: new Date((tx.info.blockTime ?? Date.now() / 1000) * 1000),
    blockHeight: tx.info.slot,
    // TODO: fix
    fee: new BigNumber(0),
    // TODO: fix
    recipients: [],
    // TODO: fix
    senders: [],
    // TODO: fix
    value: new BigNumber(0),
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

/*

addTokens([
  {
    contractAddress: "some contracts add",
    id: "G6nE3kXycaWnWVsDy3H1DjBJ3hHA4cWDLfJphR4cpPzY",
    name: "Fake Solana Token",
    ticker: "FAK TICKER",
    parentCurrency: (0, currencies_1.getCryptoCurrencyById)('solana'),
    tokenType: "spl-token",
    type: "TokenCurrency",
    units: [
      {
        code: "FAK CODE",
        magnitude: 9,
        name: "FAK NAME",
      },
    ],
  },
]);
*/
