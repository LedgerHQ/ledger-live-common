import { makeScanAccounts, makeSync, mergeOps } from "../../bridge/jsHelpers";
import {
  Account,
  CryptoCurrency,
  encodeAccountId,
  encodeTokenAccountId,
  Operation,
  SubAccount,
  TokenAccount,
  TokenCurrency,
} from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { getAccount, getOperations } from "./api";
import BigNumber from "bignumber.js";
import { TokenAccountInfo } from "./api/validators/accounts/token";

import { create } from "superstruct";
import {
  decodeAccountId,
  decodeTokenAccountId,
  emptyHistoryCache,
} from "../../account";
import { getTransactions, TransactionDescriptor } from "./api/web3";

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

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
    blockHeight,
    balance: mainAccBalance,
    spendableBalance: mainAccSpendableBalance,
    tokenAccounts,
  } = await getAccount(mainAccAddress);

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

  const tokenAccSubAccNewTxsList = await tokenAccSubAccPairList.reduce(
    async (asyncAccum, [tokenAcc, subAcc]) => {
      const accum = await asyncAccum;
      const address = tokenAcc.pubkey.toBase58();
      const latestLoadedTxSignature = subAcc?.operations?.[0]?.hash;
      const accsWithTxs = [
        tokenAcc,
        subAcc,
        await drainAsyncGen(getTransactions(address, latestLoadedTxSignature)),
      ] as const;
      accum.push(accsWithTxs);
      return accum;
    },
    Promise.resolve(
      [] as (readonly [
        OnChainTokenAccount,
        TokenAccount | undefined,
        TransactionDescriptor[]
      ])[]
    )
  );

  function newSubAcc(
    tokenAcc: OnChainTokenAccount,
    txs: TransactionDescriptor[]
  ): TokenAccount {
    return {};
  }

  function patchSubAcc(
    subAcc: TokenAccount,
    tokenAcc: OnChainTokenAccount,
    txs: TransactionDescriptor[]
  ): TokenAccount {
    return {} as any;
  }

  const nextSubAccs = tokenAccSubAccNewTxsList.reduce(
    (accum, [tokenAcc, subAcc, newTxs]) => {
      if (newTxs.length <= 0 && subAcc === undefined) {
        // TODO: remove, should never happen though
        throw new Error("unexpected combination of subAcc and new txs");
        return accum;
      }
      const nextSubAcc =
        subAcc === undefined
          ? newSubAcc(tokenAcc, newTxs)
          : patchSubAcc(subAcc, tokenAcc, newTxs);
      accum.push(nextSubAcc);
      return accum;
    },
    [] as SubAccount[]
  );

  const mainAccountLastTxSignature = mainInitialAcc?.operations[0]?.hash;

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

  const mainAccountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: mainAccAddress,
    derivationMode,
  });

  const newOperations = await getOperations(
    mainAccountId,
    mainAccAddress,
    untilTxHash
  );

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

  const shape: Partial<Account> = {
    subAccounts,
    id: mainAccountId,
    blockHeight,
    balance: mainAccBalance,
    spendableBalance: mainAccSpendableBalance,
    operationsCount: operations.length,
  };
  return { ...shape, operations };
};

function parseTokenAccountInfoQuiet(info: any) {
  try {
    return create(info, TokenAccountInfo);
  } catch (e) {
    // TODO: throw away
    console.error(e);
    return undefined;
  }
}

const postSync = (initial: Account, parent: Account) => {
  return parent;
};

const fakeTokenCurrency = (
  parentCurrency: CryptoCurrency,
  info?: TokenAccountInfo
): TokenCurrency => {
  return {
    // TODO: check that
    contractAddress: info?.owner.toBase58() ?? "some contract address",
    parentCurrency: parentCurrency,
    id: info?.mint.toBase58() ?? "some id here",
    // TODO: fix
    name: "N/A",
    // TODO: fix
    ticker: "N/A",
    tokenType: "solana",
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
  return `${accountId}:${address}`;
}

function decodeAccountIdWithTokenAccountAddress(
  accountIdWithTokenAccountAddress: string
) {
  const lastColonIndex = accountIdWithTokenAccountAddress.lastIndexOf(":");
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

export const sync = makeSync(getAccountShape, postSync);
export const scanAccounts = makeScanAccounts(getAccountShape);
