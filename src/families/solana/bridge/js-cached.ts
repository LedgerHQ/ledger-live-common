import type { Account } from "../../../types";
import type { PrepareTxAPI, Transaction, TransactionModel } from "../types";
import { prepareTransaction as prepareTransactionWithAPI } from "../js-prepareTransaction";
import { assertUnreachable, clusterByCurrencyId } from "../utils";
import { makeLRUCache } from "../../../cache";
import {
  Config,
  findAssociatedTokenAccountPubkey,
  getAssociatedTokenAccountCreationFee,
  getBalance,
  getMaybeTokenAccount,
  getTxFeeCalculator,
} from "../api";

const prepareTransaction = async (mainAccount: Account, tx: Transaction) => {
  const config = {
    cluster: clusterByCurrencyId(mainAccount.currency.id),
  };

  const api = await getApiPrepareTxAPI(config);

  return prepareTransactionWithAPI(mainAccount, tx, api);
};

function minutes(num: number, max = 100) {
  return {
    max,
    maxAge: num * 60 * 1000,
  };
}

const cacheKeyCluster = (config: Config) => config.cluster;
const cacheKeyAddress = (address: string) => address;
const cacheKeyEmpty = () => "" as const;

async function getApiPrepareTxAPI(config: Config): Promise<PrepareTxAPI> {
  return {
    findAssociatedTokenAccountPubkey: findAssociatedTokenAccountPubkeyCached,
    getBalance: await getBalanceCached(config),
    getAssociatedTokenAccountCreationFee:
      await getAssociatedTokenAccountCreationFeeCached(config),
    getTxFeeCalculator: await getTxFeeCalculatorCached(config),
    getMaybeTokenAccount: await getMaybeTokenAccountCached(config),
  };
}

const getBalanceCached = makeLRUCache(
  (config: Config) =>
    Promise.resolve(
      makeLRUCache(getBalance(config), cacheKeyAddress, minutes(1))
    ),
  cacheKeyCluster,
  minutes(1000)
);

const getAssociatedTokenAccountCreationFeeCached = makeLRUCache(
  (config: Config) =>
    Promise.resolve(
      makeLRUCache(
        getAssociatedTokenAccountCreationFee(config),
        cacheKeyEmpty,
        minutes(5)
      )
    ),
  cacheKeyCluster,
  minutes(1000)
);

const getTxFeeCalculatorCached = makeLRUCache(
  (config: Config) =>
    Promise.resolve(
      makeLRUCache(getTxFeeCalculator(config), cacheKeyEmpty, minutes(5))
    ),
  cacheKeyCluster,
  minutes(1000)
);

const getMaybeTokenAccountCached = makeLRUCache(
  (config: Config) =>
    Promise.resolve(
      makeLRUCache(getMaybeTokenAccount(config), cacheKeyAddress, minutes(1))
    ),
  cacheKeyCluster,
  minutes(1000)
);

const findAssociatedTokenAccountPubkeyCached = makeLRUCache(
  findAssociatedTokenAccountPubkey,
  (owner, mint) => `${owner}:${mint}`,
  minutes(1000)
);

const cacheKeyByModelUIState = (model: TransactionModel) => {
  switch (model.kind) {
    case "transfer":
      return `{
        memo: ${model.uiState.memo}
      }`;
    case "token.transfer":
      return `{
        memo: ${model.uiState.memo},
        subAccountId: ${model.uiState.subAccountId}
      }`;
    case "token.createATA":
      return `{
        tokenId: ${model.uiState.tokenId}
      }`;
    default:
      return assertUnreachable(model);
  }
};

const cacheKeyByAccTx = (mainAccount: Account, tx: Transaction) => {
  const cluster = clusterByCurrencyId(mainAccount.currency.id);
  // json stringify is not stable, using a stable one from a library is probably an overkill
  return `{
    cluster: ${cluster},
    account: {
      id: ${mainAccount.id},
      address: ${mainAccount.freshAddress},
      syncDate: ${mainAccount.lastSyncDate.toISOString()},
    },
    tx: {
      recipient: ${tx.recipient},
      amount: ${tx.amount.toNumber()},
      useAllAmount: ${tx.useAllAmount},
      subAccountId: ${tx.subAccountId},
      model: {
        kind: ${tx.model.kind},
        uiState: ${cacheKeyByModelUIState(tx.model)},
      },
    },
  }`;
};

const prepareTransactionCached = makeLRUCache(
  prepareTransaction,
  cacheKeyByAccTx,
  minutes(1)
);

export { prepareTransactionCached };
