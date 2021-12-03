import {
  Account,
  AccountBridge,
  CurrencyBridge,
  Operation,
  TransactionStatus,
  SignOperationEvent,
  CryptoCurrency,
} from "../../../types";
import type { CosmosValidatorItem, Transaction } from "../types";
import { getValidators, hydrateValidators } from "../validators";
// import { getAccountInfo } from "../../../api/Cosmos";
import { BigNumber } from "bignumber.js";
// import { getMainAccount } from "../../../account";
import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";
import { makeSync, makeScanAccounts } from "../../../bridge/jsHelpers";
import flatMap from "lodash/flatMap";
import {
  getTransactions,
  getHeight,
  getAllBalances,
  // getValidators,
} from "../../../api/Cosmos";
// import { FeeNotLoaded } from "@ledgerhq/errors";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Cosmos from "@ledgerhq/hw-app-str";
import { Observable } from "rxjs";
import {
  asSafeCosmosPreloadData,
  setCosmosPreloadData,
} from "../preloadedData";
// import { log } from "@ledgerhq/logs";

// the balance does not update straightaway so we should ignore recent operations if they are in pending for a bit
const preferPendingOperationsUntilBlockValidation = 35;

const txToOps =
  ({ id, address }) =>
  (tx: Record<string, any>): Operation[] => {
    const ops: Operation[] = [];
    const hash = tx.txid;
    const date = new Date(tx.time * 1000);
    const value = tx.amount;
    const from = tx.address_from;
    const to = tx.address_to;
    const sending = address === from;
    const receiving = address === to;
    const fee = new BigNumber(0);

    if (sending) {
      ops.push({
        id: `${id}-${hash}-OUT`,
        hash,
        type: "OUT",
        value: value.plus(fee),
        fee,
        blockHeight: tx.block_height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date,
        extra: {},
      });
    }

    if (receiving) {
      ops.push({
        id: `${id}-${hash}-IN`,
        hash,
        type: "IN",
        value,
        fee,
        blockHeight: tx.block_height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date,
        extra: {},
      });
    }

    return ops;
  };

const postSync = (initial: Account, parent: Account): Account => {
  function evictRecentOpsIfPending(a) {
    a.pendingOperations.forEach((pending) => {
      const i = a.operations.findIndex((o) => o.id === pending.id);

      if (i !== -1) {
        const diff = parent.blockHeight - (a.operations[i].blockHeight || 0);

        if (diff < preferPendingOperationsUntilBlockValidation) {
          a.operations.splice(i, 1);
        }
      }
    });
  }

  evictRecentOpsIfPending(parent);
  parent.subAccounts && parent.subAccounts.forEach(evictRecentOpsIfPending);
  return parent;
};

const getAccountShape = async (info) => {
  const blockHeight = await getHeight();
  const balance = await getAllBalances(info.address);
  const txs = await getTransactions(info.address);
  const operations = flatMap(txs, txToOps(info));

  return {
    balance,
    operations,
    blockHeight,
  };
};

const sync = makeSync(getAccountShape, postSync);

const createTransaction = (): Transaction => ({
  family: "cosmos",
  mode: "send",
  amount: new BigNumber(0),
  fees: null,
  gas: null,
  recipient: "",
  useAllAmount: false,
  networkInfo: null,
  memo: null,
  cosmosSourceValidator: null,
  validators: [],
});

const updateTransaction = (t, patch) => {
  if ("recipient" in patch && patch.recipient !== t.recipient) {
    return { ...t, ...patch, userGasLimit: null, estimatedGasLimit: null };
  }

  return { ...t, ...patch };
};

const receive = makeAccountBridgeReceive();

const estimateMaxSpendable = async ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  account,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parentAccount,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transaction,
}) => {
  const s = await getTransactionStatus();
  return s.amount;
};

const getTransactionStatus = (): Promise<TransactionStatus> => {
  const errors: {
    gasPrice?: Error;
    gasLimit?: Error;
    recipient?: Error;
  } = {};
  const warnings: {
    gasLimit?: Error;
  } = {};
  const result = {
    errors,
    warnings,
    amount: new BigNumber(0),
    totalSpent: new BigNumber(0),
    estimatedFees: new BigNumber(0),
  };

  return Promise.resolve(result);
};

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> => {
  return t;
};

const broadcast = async ({ signedOperation: { signature } }) => {
  return await broadcast(signature);
};

const signOperation = ({
  account,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deviceId,
  transaction,
}: {
  account: Account;
  deviceId: any;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  Observable.create((o) => {
    async function main() {
      // const transport = await open(deviceId);

      try {
        o.next({
          type: "device-signature-requested",
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const unsigned = await prepareTransaction(account, transaction);
        // const unsignedPayload = unsigned.signatureBase();
        // Sign by device
        // const hwApp = new Cosmos(transport);
        /*
        const { signature } = await hwApp.signTransaction(
          account.freshAddressPath,
          unsignedPayload
        );
        unsigned.addSignature(
          account.freshAddress,
          signature.toString("base64")
        );
        */
        o.next({
          type: "device-signature-granted",
        });
        /*
         const operation = await buildOptimisticOperation(account, transaction);
        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature: unsigned.toXDR(),
            expirationDate: null,
          },
        });
        */
      } finally {
        // close(transport, deviceId);
      }
    }

    main().then(
      () => o.complete(),
      (e) => o.error(e)
    );
  });

const getPreloadStrategy = (_currency) => ({
  preloadMaxAge: 30 * 1000,
});

const currencyBridge: CurrencyBridge = {
  getPreloadStrategy,
  preload: async (currency: CryptoCurrency) => {
    const validators = await getValidators(currency);
    setCosmosPreloadData({
      validators,
    });
    return Promise.resolve({
      validators,
    });
  },
  hydrate: (data: { validators?: CosmosValidatorItem[] }) => {
    if (!data || typeof data !== "object") return;
    const { validators } = data;
    if (
      !validators ||
      typeof validators !== "object" ||
      !Array.isArray(validators)
    )
      return;
    hydrateValidators(validators);
    setCosmosPreloadData(asSafeCosmosPreloadData(data));
  },
  scanAccounts: makeScanAccounts(getAccountShape),
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  estimateMaxSpendable,
  getTransactionStatus,
  sync,
  receive,
  signOperation,
  broadcast,
};

export default {
  currencyBridge,
  accountBridge,
};
