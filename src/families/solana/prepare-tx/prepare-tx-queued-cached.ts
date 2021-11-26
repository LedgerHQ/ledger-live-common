import { Account } from "../../../types";
import {
  Config,
  findAssociatedTokenAccountPubkey,
  getAssociatedTokenAccountCreationFee,
  getBalance,
  getMaybeTokenAccount,
  getTxFeeCalculator,
} from "../api";
import { PrepareTxAPI, Transaction, TransactionModel } from "../types";
import { assertUnreachable, clusterByCurrencyId } from "../utils";
import { getPrepareTxAPIQueued } from "./prepare-tx-queued";
import { getPrepareTxAPICached, minutes } from "./prepare-tx-cached";
import { prepareTransaction as prepareTransactionWithAPI } from "../js-prepareTransaction";
import { makeLRUCache } from "../../../cache";

function getPrepareTxAPI(config: Config): PrepareTxAPI {
  return {
    findAssociatedTokenAccountPubkey,
    getAssociatedTokenAccountCreationFee:
      getAssociatedTokenAccountCreationFee(config),
    getBalance: getBalance(config),
    getMaybeTokenAccount: getMaybeTokenAccount(config),
    getTxFeeCalculator: getTxFeeCalculator(config),
    config,
  };
}

const prepareTransaction = async (mainAccount: Account, tx: Transaction) => {
  const config = {
    cluster: clusterByCurrencyId(mainAccount.currency.id),
  };

  const api = getPrepareTxAPI(config);
  const queuedApi = getPrepareTxAPIQueued(api);
  const queuedAndCachedApi = await getPrepareTxAPICached(queuedApi);

  return prepareTransactionWithAPI(mainAccount, tx, queuedAndCachedApi);
};

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

const prepareTransactionQueuedAndCached = makeLRUCache(
  prepareTransaction,
  cacheKeyByAccTx,
  minutes(1)
);

export { prepareTransactionQueuedAndCached };
