import { CryptoCurrency, findTokenById, listTokens, listTokensForCryptoCurrency } from "@ledgerhq/cryptoassets";
import BigNumber from "bignumber.js";
import { emptyHistoryCache } from "../../account";
import { CoreAccount, CoreOperation } from "../../libcore/types";
import { minimalOperationsBuilder } from "../../reconciliation";
import { Account, SyncConfig, TokenAccount } from "../../types";
import { getAccountESDTTokens } from "./api";
import { buildESDTOperation } from "./buildESDTOperation";
const OperationOrderKey = {
  date: 0,
};

async function buildElrondESDTTokenAccount({
  parentAccountId,
  token,
  existingTokenAccount,
  balance,
}) {
  const extractedId = token.id;
  const id = parentAccountId + "+" + extractedId;

  const getAllOperations = async () => {
    // const query = await coreAccount.queryOperations();
    // await query.complete();
    // await query.addOrder(OperationOrderKey.date, false);
    // const coreOperations = await query.execute();
    // const operations = await minimalOperationsBuilder(
    //   (existingTokenAccount && existingTokenAccount.operations) || [],
    //   coreOperations,
    //   (coreOperation: CoreOperation) =>
    //     buildESDTOperation({
    //       coreOperation,
    //       accountId: id,
    //       tokenId: extractedId,
    //     })
    // );
    return [];
  };

  const operations = await getAllOperations();
  const tokenAccount: TokenAccount = {
    type: "TokenAccount",
    id,
    parentId: parentAccountId,
    starred: false,
    token,
    operationsCount: operations.length,
    operations,
    pendingOperations: [],
    balance,
    spendableBalance: balance,
    swapHistory: [],
    creationDate:
      // operations.length > 0
      //   ? operations[operations.length - 1].date
      new Date(),
    balanceHistoryCache: emptyHistoryCache, // calculated in the jsHelpers
  };
  return tokenAccount;
}

async function elrondBuildESDTTokenAccounts({
  currency,
  accountId,
  existingAccount,
  syncConfig,
}: {
  currency: CryptoCurrency;
  accountId: string;
  existingAccount: Account | null | undefined;
  syncConfig: SyncConfig;
}): Promise<TokenAccount[] | undefined> {
  const { blacklistedTokenIds = [] } = syncConfig;
  if (listTokensForCryptoCurrency(currency).length === 0) {
    return undefined;
  } 
  const tokenAccounts: TokenAccount[] = [];

  const existingAccountByTicker = {}; // used for fast lookup

  const existingAccountTickers: string[] = []; // used to keep track of ordering

  if (existingAccount && existingAccount.subAccounts) {
    for (const existingSubAccount of existingAccount.subAccounts) {
      if (existingSubAccount.type === "TokenAccount") {
        const { ticker, id } = existingSubAccount.token;

        if (!blacklistedTokenIds.includes(id)) {
          existingAccountTickers.push(ticker);
          existingAccountByTicker[ticker] = existingSubAccount;
        }
      }
    }
  }

  const accountESDTs = await getAccountESDTTokens();
  accountESDTs.forEach(async (esdt) => {
    const token = findTokenById(`elrond/esdt/${esdt.identifier}`);

    if (token && !blacklistedTokenIds.includes(token.id)) {
      const existingTokenAccount = existingAccountByTicker[token.ticker];
      const tokenAccount = await buildElrondESDTTokenAccount({
        parentAccountId: accountId,
        existingTokenAccount,
        token,
        balance: new BigNumber(esdt.balance),
      });
     
      if (tokenAccount) {
        tokenAccounts.push(tokenAccount);
      }
    }
  });

  // Preserve order of tokenAccounts from the existing token accounts
  tokenAccounts.sort((a, b) => {
    const i = existingAccountTickers.indexOf(a.token.ticker);
    const j = existingAccountTickers.indexOf(b.token.ticker);
    if (i === j) return 0;
    if (i < 0) return 1;
    if (j < 0) return -1;
    return i - j;
  });

  return tokenAccounts;
}

export default elrondBuildESDTTokenAccounts;