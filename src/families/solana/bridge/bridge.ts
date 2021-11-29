import {
  GetAccountShape,
  makeAccountBridgeReceive,
  makeSync as makeSyncHelper,
  makeScanAccounts as makeScanHelper,
} from "../../../bridge/jsHelpers";
import type {
  Account,
  AccountBridge,
  BroadcastFnSignature,
  CurrencyBridge,
  SignOperationFnSignature,
} from "../../../types";
import type { Transaction } from "../types";
import { getAccountShapeWithAPI } from "../js-synchronization";
import getTransactionStatus from "../js-getTransactionStatus";
import estimateMaxSpendable from "../js-estimateMaxSpendable";
import createTransaction, { updateTransaction } from "../js-createTransaction";
import { signOperationWithAPI } from "../js-signOperation";
import { broadcastWithAPI } from "../js-broadcast";
import { prepareTransaction as prepareTransactionWithAPI } from "../js-prepareTransaction";
import { ChainAPI, Config } from "../api";
import { makeLRUCache } from "../../../cache";
import { clusterByCurrencyId } from "../utils";
import { seconds } from "../api/cached";
import hash from "object-hash";

function makePrepare(getChainAPI: (config: Config) => Promise<ChainAPI>) {
  async function prepareTransaction(
    mainAccount: Account,
    transaction: Transaction
  ) {
    const config = {
      cluster: clusterByCurrencyId(mainAccount.currency.id),
    };

    const chainAPI = await getChainAPI(config);
    return prepareTransactionWithAPI(mainAccount, transaction, chainAPI);
  }

  const cacheKeyByAccTx = (account: Account, tx: Transaction) =>
    hash({
      account: {
        id: account.id,
        address: account.freshAddress,
        syncDate: account.lastSyncDate.toISOString(),
      },
      tx: {
        recipient: tx.recipient,
        amount: tx.amount.toNumber(),
        useAllAmount: tx.useAllAmount,
        subAccountId: tx.subAccountId,
        model: tx.model,
      },
    });

  return makeLRUCache(prepareTransaction, cacheKeyByAccTx, seconds(30));
}

function makeSyncAndScan(getChainAPI: (config: Config) => Promise<ChainAPI>) {
  const getAccountShape: GetAccountShape = async (info) => {
    const config = {
      cluster: clusterByCurrencyId(info.currency.id),
    };

    const chainAPI = await getChainAPI(config);
    return getAccountShapeWithAPI(info, chainAPI);
  };
  return {
    sync: makeSyncHelper(getAccountShape),
    scan: makeScanHelper(getAccountShape),
  };
}

function makeBroadcast(
  getChainAPI: (config: Config) => Promise<ChainAPI>
): BroadcastFnSignature {
  return async (info) => {
    const config = {
      cluster: clusterByCurrencyId(info.account.currency.id),
    };
    const api = await getChainAPI(config);
    return broadcastWithAPI(info, api);
  };
}

function makeSign(
  getChainAPI: (config: Config) => Promise<ChainAPI>
): SignOperationFnSignature<Transaction> {
  return (info) => {
    const config = {
      cluster: clusterByCurrencyId(info.account.currency.id),
    };
    const api = () => getChainAPI(config);
    return signOperationWithAPI(info, api);
  };
}

export function makeBridges(
  getChainAPI: (config: Config) => Promise<ChainAPI>
): {
  currencyBridge: CurrencyBridge;
  accountBridge: AccountBridge<Transaction>;
} {
  const { sync, scan } = makeSyncAndScan(getChainAPI);

  const accountBridge: AccountBridge<Transaction> = {
    createTransaction,
    updateTransaction,
    estimateMaxSpendable,
    getTransactionStatus,
    sync,
    receive: makeAccountBridgeReceive(),
    prepareTransaction: makePrepare(getChainAPI),
    broadcast: makeBroadcast(getChainAPI),
    signOperation: makeSign(getChainAPI),
  };

  const currencyBridge: CurrencyBridge = {
    preload: async (): Promise<any> => {},
    hydrate: (): void => {},
    scanAccounts: scan,
  };

  return {
    currencyBridge,
    accountBridge,
  };
}
