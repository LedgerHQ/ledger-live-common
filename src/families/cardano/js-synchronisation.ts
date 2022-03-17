import type {
  Account,
  CryptoCurrency,
  Operation,
  SubAccount,
  TokenAccount,
} from "../../types";
import {
  GetAccountShape,
  makeScanAccounts,
  mergeOps,
} from "../../bridge/jsHelpers";
import { makeSync } from "../../bridge/jsHelpers";
import { emptyHistoryCache, encodeAccountId } from "../../account";

import BigNumber from "bignumber.js";
import Ada from "@cardano-foundation/ledgerjs-hw-app-cardano";
import { str_to_path } from "@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils";
import { utils as TyphonUtils } from "@stricahq/typhonjs";
import { APITransaction } from "./api/api-types";
import { CardanoOutput, PaymentCredential, Token } from "./types";
import uniqBy from "lodash/uniqBy";
import {
  getAccountStakeCredential,
  getBaseAddress,
  getBipPathString,
  getOperationType,
  getTokenAssetId,
  getTokenDiff,
  // mergeTokens,
} from "./logic";
import { encodeOperationId } from "../../operation";
import { getOperations } from "./api/getOperations";
import groupBy from "lodash/groupBy";
import { getNetworkParameters } from "./networks";

function getAccountChange(
  t: APITransaction,
  accountCredentialsMap: Record<string, PaymentCredential>
): { ada: BigNumber; tokens: Array<Token> } {
  let accountInputAda = new BigNumber(0);
  const accountInputTokens: Array<Token> = [];
  t.inputs.forEach((i) => {
    if (accountCredentialsMap[i.paymentKey]) {
      accountInputAda = accountInputAda.plus(i.value);
      accountInputTokens.push(
        ...i.tokens.map((t) => ({
          assetName: t.assetName,
          policyId: t.policyId,
          amount: new BigNumber(t.value),
        }))
      );
    }
  });

  let accountOutputAda = new BigNumber(0);
  const accountOutputTokens: Array<Token> = [];
  t.outputs.forEach((o) => {
    if (accountCredentialsMap[o.paymentKey]) {
      accountOutputAda = accountOutputAda.plus(o.value);
      accountOutputTokens.push(
        ...o.tokens.map((t) => ({
          assetName: t.assetName,
          policyId: t.policyId,
          amount: new BigNumber(t.value),
        }))
      );
    }
  });

  return {
    ada: accountOutputAda.minus(accountInputAda),
    tokens: getTokenDiff(accountOutputTokens, accountInputTokens),
  };
}

function mapApiTxToOperation(
  tx: APITransaction,
  accountId: string,
  accountCredentialsMap: Record<string, PaymentCredential>
): Array<Operation> {
  const operations: Array<Operation> = [];
  const accountChange = getAccountChange(tx, accountCredentialsMap);
  const mainOperationType = getOperationType({
    valueChange: accountChange.ada,
    fees: new BigNumber(tx.fees),
  });
  const mainOperation: Operation = {
    accountId,
    id: encodeOperationId(accountId, tx.hash, mainOperationType),
    hash: tx.hash,
    type: mainOperationType,
    fee: new BigNumber(tx.fees),
    value: accountChange.ada.absoluteValue(),
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
  operations.push(mainOperation);

  accountChange.tokens.forEach((t) => {
    const tokenAccountId = getTokenAssetId(t);
    const tokenOperationType = getOperationType({
      valueChange: t.amount,
      fees: new BigNumber(0), //TODO: check if this works in all cases
    });
    const tokenOperation: Operation = {
      accountId: tokenAccountId,
      id: encodeOperationId(tokenAccountId, tx.hash, tokenOperationType),
      hash: tx.hash,
      type: tokenOperationType,
      fee: new BigNumber(tx.fees),
      value: t.amount.absoluteValue(),
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
    operations.push(tokenOperation);
  });

  return operations;
}

function filterUtxos(
  newTransactions: Array<APITransaction>,
  oldUtxos: Array<CardanoOutput>,
  accountCredentialsMap: Record<string, PaymentCredential>
): Array<CardanoOutput> {
  const newUtxos: Array<CardanoOutput> = [];
  const spentUtxoKeys: Set<string> = new Set();

  newTransactions.forEach((t) => {
    t.inputs.forEach((i) => {
      const cred = accountCredentialsMap[i.paymentKey];
      if (cred) spentUtxoKeys.add(`${i.txId}#${i.index}`);
    });

    t.outputs.forEach((o, outputIndex) => {
      const cred = accountCredentialsMap[o.paymentKey];
      if (cred) {
        newUtxos.push({
          hash: t.hash,
          index: outputIndex,
          address: o.address,
          amount: new BigNumber(o.value),
          tokens: o.tokens.map((token) => ({
            assetName: token.assetName,
            policyId: token.policyId,
            amount: new BigNumber(token.value),
          })),
          paymentCredential: {
            key: o.paymentKey,
            path: cred.path,
          },
        });
      }
    });
  });

  const utxos = uniqBy(
    [...oldUtxos, ...newUtxos],
    (u) => `${u.hash}#${u.index}`
  ).filter((u) => !spentUtxoKeys.has(`${u.hash}#${u.index}`));

  return utxos;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function prepareTokensAccounts({
  initialAccount,
  parentAccountId,
  tokensBalance,
  operationsMap,
  parentCurrency,
}: {
  parentCurrency: CryptoCurrency;
  parentAccountId: string;
  initialAccount: Account | undefined;
  tokensBalance: Array<Token>;
  operationsMap: Record<string, Array<Operation>>;
}): Array<SubAccount> {
  function getNewSubAccount(
    token: Token,
    operations: Array<Operation>
  ): TokenAccount {
    const assetId = getTokenAssetId(token);
    return {
      type: "TokenAccount",
      id: assetId,
      parentId: parentAccountId,
      token: {
        type: "TokenCurrency",
        name: token.assetName,
        // TODO: get ticker from registry
        ticker: "",
        //TODO: get units from registry
        units: [
          {
            name: token.assetName,
            code: token.assetName,
            magnitude: 0,
            showAllDigits: true,
          },
        ],
        id: assetId,
        // using assetId as cardano do not have contractAddress
        contractAddress: assetId,
        parentCurrency,
        tokenType: "", //TODO: give tokenType
      },
      balance: token.amount,
      spendableBalance: token.amount,
      creationDate: new Date(),
      operationsCount: operations.length,
      operations,
      pendingOperations: [],
      starred: false,
      balanceHistoryCache: emptyHistoryCache,
      swapHistory: [],
    };
  }

  const subAccountsMap = (initialAccount?.subAccounts || []).reduce(
    (finalMap, subAccount) => {
      finalMap[subAccount.id] = subAccount;
      return finalMap;
    },
    {} as Record<string, SubAccount>
  );

  tokensBalance.forEach((t) => {
    const tokenAccountId = getTokenAssetId(t);
    if (subAccountsMap[tokenAccountId]) {
      subAccountsMap[tokenAccountId].balance = t.amount;
    } else {
      subAccountsMap[tokenAccountId] = getNewSubAccount(t, []);
    }
  });

  for (const tokenAccountId in operationsMap) {
    if (subAccountsMap[tokenAccountId]) {
      const oldOperations = subAccountsMap[tokenAccountId].operations;
      const newOperations = operationsMap[tokenAccountId];

      const operations = mergeOps(oldOperations, newOperations);
      subAccountsMap[tokenAccountId].operations = operations;
    }
  }

  return Object.values(subAccountsMap);
}

export const getAccountShape: GetAccountShape = async (info) => {
  const {
    transport,
    currency,
    index: accountIndex,
    derivationPath,
    derivationMode,
    initialAccount,
  } = info;
  // In case we get a full derivation path
  const rootPath = derivationPath.split("/", 2).join("/");
  const accountPath = `${rootPath}/${accountIndex}'`;

  const paramXpub = initialAccount?.xpub;
  let extendedPubKeyRes;
  if (!paramXpub) {
    if (!transport) {
      // hwapp not provided
      throw new Error("hwapp required to generate the xpub");
    }
    const ada = new Ada(transport);
    extendedPubKeyRes = await ada.getExtendedPublicKey({
      path: str_to_path(accountPath),
    });
  }
  const xpub =
    paramXpub ||
    `${extendedPubKeyRes.publicKeyHex}${extendedPubKeyRes.chainCodeHex}`;
  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: xpub,
    derivationMode,
  });

  const requiredConfirmations = 90;
  const syncFromBlockHeight =
    initialAccount?.blockHeight &&
    initialAccount.blockHeight > requiredConfirmations
      ? initialAccount.blockHeight - requiredConfirmations
      : 0;

  const {
    transactions: newTransactions,
    blockHeight,
    externalCredentials,
    internalCredentials,
  } = await getOperations(
    xpub,
    accountIndex,
    initialAccount,
    syncFromBlockHeight
  );

  const accountCredentialsMap = [
    ...externalCredentials,
    ...internalCredentials,
  ].reduce((finalMap, cred) => {
    finalMap[cred.key] = cred;
    return finalMap;
  }, {} as Record<string, PaymentCredential>);

  const stableOperationsIds = {};
  (initialAccount?.operations || []).forEach((o) => {
    if ((o.blockHeight as number) < syncFromBlockHeight) {
      stableOperationsIds[o.hash] = o;
    }
  });

  const oldUtxos = (initialAccount?.cardanoResources?.utxos || []).filter(
    (u) => stableOperationsIds[u.hash]
  );
  const utxos = filterUtxos(newTransactions, oldUtxos, accountCredentialsMap);
  const accountBalance = utxos.reduce(
    (total, u) => total.plus(u.amount),
    new BigNumber(0)
  );
  // const tokensBalance = mergeTokens(utxos.map((u) => u.tokens).flat());

  const allNewOperations = newTransactions
    .map((t) => mapApiTxToOperation(t, accountId, accountCredentialsMap))
    .flat();

  const newOperations = groupBy(allNewOperations, (o) => o.accountId);
  const accountNewOperations = newOperations[accountId] || [];
  const accountOperations = mergeOps(
    Object.values(stableOperationsIds),
    accountNewOperations
  );

  // const subAccounts = prepareTokensAccounts({
  //   parentAccountId: accountId,
  //   parentCurrency: currency,
  //   initialAccount,
  //   tokensBalance,
  //   operationsMap: newOperations,
  // });

  const stakeCredential = getAccountStakeCredential(xpub, accountIndex);
  // TODO: remove fix currencyId cardano_testnet
  // const networkParams = getNetworkParameters(account.currency.id);
  const networkParams = getNetworkParameters("cardano_testnet");
  const freshAddresses = externalCredentials
    .filter((c) => !c.isUsed)
    .map((c) => ({
      derivationPath: getBipPathString(c.path),
      address: getBaseAddress({
        networkId: networkParams.networkId,
        paymentCred: c,
        stakeCred: stakeCredential,
      }).getBech32(),
    }));

  return {
    id: accountId,
    xpub,
    balance: accountBalance,
    spendableBalance: accountBalance,
    operations: accountOperations,
    // subAccounts,
    freshAddresses,
    freshAddress: freshAddresses[0].address,
    freshAddressPath: freshAddresses[0].derivationPath,
    blockHeight,
    cardanoResources: {
      utxos,
      externalCredentials,
      internalCredentials,
    },
  };
};

export const scanAccounts = makeScanAccounts(getAccountShape);

export const sync = makeSync(getAccountShape);
