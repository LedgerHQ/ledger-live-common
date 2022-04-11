import BigNumber from "bignumber.js";
import { encodeOperationId } from "../../operation";
import {
  Account,
  CryptoCurrency,
  Operation,
  SubAccount,
  TokenAccount,
} from "../../types";
import { APITransaction } from "./api/api-types";
import { getAccountChange, mergeTokens } from "./logic";
import { CardanoOutput, PaymentCredential } from "./types";
import { utils as TyphonUtils } from "@stricahq/typhonjs";
import { findTokenById, TokenCurrency } from "@ledgerhq/cryptoassets";
import {
  decodeTokenAccountId,
  emptyHistoryCache,
  encodeTokenAccountId,
} from "../../account";
import { groupBy, keyBy } from "lodash";
import { mergeOps } from "../../bridge/jsHelpers";

export const getTokenAssetId = ({
  policyId,
  assetName,
}: {
  policyId: string;
  assetName: string;
}): string => `${policyId}${assetName}`;

export const decodeTokenAssetId = (
  id: string
): { policyId: string; assetName: string } => {
  const policyId = id.slice(0, 56);
  const assetName = id.slice(56);
  return { policyId, assetName };
};

const encodeTokenCurrencyId = (
  parentCurrency: CryptoCurrency,
  assetId: string
): string => `${parentCurrency.id}/native/${assetId}`;

export const decodeTokenCurrencyId = (
  id: string
): { parentCurrencyId: string; type: string; assetId: string } => {
  const [parentCurrencyId, type, assetId] = id.split("/");
  return {
    parentCurrencyId,
    type,
    assetId,
  };
};

/**
 * @returns operations of tokens that are defined in ledgerjs cryptoassets
 */
const mapTxToTokenAccountOperation = ({
  parentAccountId,
  parentCurrency,
  newTransactions,
  accountCredentialsMap,
}: {
  parentAccountId: string;
  parentCurrency: CryptoCurrency;
  newTransactions: Array<APITransaction>;
  accountCredentialsMap: Record<string, PaymentCredential>;
}): Array<Operation> => {
  const operations: Array<Operation> = [];

  newTransactions.forEach((tx) => {
    const accountChange = getAccountChange(tx, accountCredentialsMap);
    accountChange.tokens.forEach((token) => {
      const assetId = getTokenAssetId({
        policyId: token.policyId,
        assetName: token.assetName,
      });
      const tokenCurrencyId = encodeTokenCurrencyId(parentCurrency, assetId);
      const tokenCurrency = findTokenById(tokenCurrencyId);
      // skip the unsupported tokens by ledger-live
      if (tokenCurrency === null || tokenCurrency === undefined) {
        return;
      }

      const tokenAccountId = encodeTokenAccountId(
        parentAccountId,
        tokenCurrency
      );

      const tokenOperationType = token.amount.lt(0) ? "OUT" : "IN";
      const operation: Operation = {
        accountId: tokenAccountId,
        id: encodeOperationId(tokenAccountId, tx.hash, tokenOperationType),
        hash: tx.hash,
        type: tokenOperationType,
        fee: new BigNumber(tx.fees),
        value: token.amount.absoluteValue(),
        senders: tx.inputs.map((i) =>
          TyphonUtils.getAddressFromHex(i.address).getBech32()
        ),
        recipients: tx.outputs.map((o) =>
          TyphonUtils.getAddressFromHex(o.address).getBech32()
        ),
        blockHeight: tx.blockHeight,
        date: new Date(tx.timestamp),
        extra: {},
        blockHash: undefined,
      };
      operations.push(operation);
    });
  });

  return operations;
};

export function buildSubAccounts({
  initialAccount,
  parentAccountId,
  parentCurrency,
  newTransactions,
  utxos,
  accountCredentialsMap,
}: {
  initialAccount: Account | undefined;
  parentAccountId: string;
  parentCurrency: CryptoCurrency;
  newTransactions: Array<APITransaction>;
  utxos: Array<CardanoOutput>;
  accountCredentialsMap: Record<string, PaymentCredential>;
}): Array<SubAccount> {
  const initialTokenAccountsById = keyBy(
    initialAccount?.subAccounts || [],
    (a) => a.id
  );
  const tokenOperations: Array<Operation> = mapTxToTokenAccountOperation({
    parentAccountId,
    parentCurrency,
    newTransactions: newTransactions,
    accountCredentialsMap,
  });
  const tokenOperationsByAccId = groupBy(tokenOperations, (o) => o.accountId);

  const tokensBalanceByAssetId = keyBy(
    mergeTokens(utxos.map((u) => u.tokens).flat()),
    (t) => getTokenAssetId(t)
  );

  for (const tokenAccountId in tokenOperationsByAccId) {
    const tokenAccount = initialTokenAccountsById[tokenAccountId] as
      | TokenAccount
      | undefined;
    const tokenCurrency = decodeTokenAccountId(tokenAccountId)
      .token as TokenCurrency;
    const assetId = tokenCurrency.contractAddress;
    const balance = tokensBalanceByAssetId[assetId]?.amount || new BigNumber(0);
    const oldOperations = tokenAccount?.operations || [];
    const newOperations = tokenOperationsByAccId[tokenAccountId];
    const operations = mergeOps(oldOperations, newOperations);

    if (tokenAccount) {
      tokenAccount.balance = balance;
      tokenAccount.spendableBalance = balance;
      tokenAccount.operations = operations;
      tokenAccount.operationsCount = operations.length;
    } else {
      const newTokenAccount: SubAccount = {
        type: "TokenAccount",
        id: tokenAccountId,
        parentId: parentAccountId,
        token: tokenCurrency,
        balance,
        spendableBalance: balance,
        creationDate: new Date(),
        operationsCount: operations.length,
        operations,
        pendingOperations: [],
        starred: false,
        balanceHistoryCache: emptyHistoryCache,
        swapHistory: [],
      };
      initialTokenAccountsById[tokenAccountId] = newTokenAccount;
    }
  }

  return Object.values(initialTokenAccountsById);
}
