// @flow
/* eslint-disable no-param-reassign */
import ArkClient from '@arkecosystem/client';
import * as ArkCrypto from '@arkecosystem/crypto';
import invariant from 'invariant';
import { BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs';
import {
  NotEnoughBalance,
  InvalidAddress,
  FeeNotLoaded,
  NetworkDown,
  InvalidAddressBecauseDestinationIsAlsoSource,
} from '@ledgerhq/errors';
import signTransaction from '../hw/signTransaction';
import getAddress from '../hw/getAddress';
import { open } from "../hw";
import {
  getDerivationModesForCurrency,
  getDerivationScheme,
  runDerivationScheme,
  isIterableDerivationMode,
  derivationModeSupportsIndex,
} from '../derivation';
import {
  getAccountPlaceholderName,
  getNewAccountPlaceholderName,
} from '../account';
import {
  apiForEndpointConfig,
  defaultEndpoint,
  networkVersion,
  networkNethash
} from '../api/Ark';
import type { Account, Operation } from '../types';
import type { CurrencyBridge, AccountBridge } from './types';

const cacheRecipientsNew = {};

type Transaction = {
  amount: BigNumber,
  recipient: string,
  fee: ?BigNumber,
  vendorField: ?string,
  networkInfo: ?{ serverFee: BigNumber },
}

type Tx = {
  id: string,
  blockId: string,
  version: number,
  type: number,
  amount: number,
  fee: number,
  sender: string,
  recipient: string,
  signature: string,
  vendorField: string,
  confirmations: number,
  timestamp: {
    epoch: number,
    unix: number,
    human: string
  }
}

// API does not return transaction blockHeight on same request
// then we can use the epoch time temporarily
async function getLastEpoch(api) {
  try  {
    const { data } = await api.resource("transactions").all({ limit: 1 });
    const transactions = data.data;

    if (!transactions || !transactions.length) {
      return 0;
    }

    return transactions[0].timestamp.epoch;
  } catch (e) {
    return 0;
  }
}

async function signAndBroadcast({ a, t, deviceId, isCancelled, onSigned, onOperationBroadcasted }) {
  const transport = await open(deviceId);
  const api = apiForEndpointConfig(ArkClient, a.endpointConfig);
  const { fee } = t;
  if (!fee) throw new FeeNotLoaded();

  try {
    const struct = ArkCrypto
      .transactionBuilder
      .transfer()
      .amount(t.amount.toString())
      .fee(t.fee && t.fee.toString())
      .recipientId(t.recipient)
      .network(networkVersion)
      .vendorField(t.vendorField)
      .sign('passphrase')
      .senderPublicKey(a.xpub)
      .getStruct();
    
    const rawTransaction = await signTransaction(
      a.currency,
      transport,
      a.freshAddressPath,
      struct
    );
    const transaction = JSON.parse(rawTransaction);

    if (!isCancelled()) {
      onSigned();
      const response = await api.resource("transactions").create({ transactions: [transaction] });
      const hasError = !!Object.keys(response.errors || {}).length;

      if (hasError) {
        const firstId = Object.keys(response.errors)[0];
        throw new Error(response.errors[firstId][0].message);
      }

      const operation = {
        id: `${a.id}-${transaction.id}-OUT`,
        hash: transaction.id,
        accountId: a.id,
        type: 'OUT',
        value: t.amount,
        fee,
        blockHash: null,
        blockHeight: null,
        senders: [a.freshAddress],
        recipients: [t.recipient],
        date: new Date(),
        extra: {},
      };
      if (t.vendorField) {
        operation.extra.vendorField = t.vendorField;
      }
      onOperationBroadcasted(operation);
    }
  } catch (e) {
    throw e;
  } finally {
    transport.close();
  }
}

function mergeOps(existing: Operation[], newFetched: Operation[]) {
  const ids = existing.map(o => o.id);
  const all = existing.concat(newFetched.filter(o => !ids.includes(o.id)));
  return all.sort((a, b) => b.date - a.date);
}

function isRecipientValid(recipient) {
  try {
    return ArkCrypto.crypto.validateAddress(recipient, networkVersion);
  } catch (e) {
    return false;
  }
}

function checkValidRecipient(account, recipient) {
  if (account.freshAddress === recipient) {
    return Promise.reject(new InvalidAddressBecauseDestinationIsAlsoSource());
  }

  if (isRecipientValid(recipient)) {
    return Promise.resolve(null);
  }

  return Promise.reject(new InvalidAddress('', { currencyName: account.currency.name }));
}


const txToOperation = (account: Account) => (data: Tx): ?Operation => {
  const type = data.sender === account.freshAddress ? 'OUT' : 'IN';
  let value = data.amount ? BigNumber(data.amount) : BigNumber(0);
  const feeValue = BigNumber(data.fee);
  if (type === 'OUT') {
    if (!Number.isNaN(feeValue)) {
      value = value.plus(feeValue);
    }
  }

  const op: $Exact<Operation> = {
    id: `${account.id}-${data.id}-${type}`,
    hash: data.id,
    accountId: account.id,
    type,
    value,
    fee: feeValue,
    blockHash: data.blockId,
    blockHeight: data.timestamp.epoch,
    senders: [data.sender],
    recipients: [data.recipient],
    date: new Date(data.timestamp.human),
    extra: {},
  };

  if (data.vendorField) {
    op.extra.vendorField = data.vendorField;
  }
  return op;
};

export const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice: (currency, deviceId) =>
    Observable.create(o => {
      let finished = false;
      const unsubscribe = () => {
        finished = true;
      };

      async function main() {
        const transport = await open(deviceId);
        
        try {
          const api = apiForEndpointConfig(ArkClient);
          const lastEpoch = await getLastEpoch(api);

          const derivationModes = getDerivationModesForCurrency(currency);
          for (const derivationMode of derivationModes) {
            const derivationScheme = getDerivationScheme({ derivationMode, currency });
            const stopAt = isIterableDerivationMode(derivationMode) ? 255 : 1;
            for (let index = 0; index < stopAt; index++) {
              if (!derivationModeSupportsIndex(derivationMode, index)) continue;
              const freshAddressPath = runDerivationScheme(
                derivationScheme,
                currency,
                {
                  account: index,
                }
              );
              
              const { address, publicKey } = await getAddress(transport, {
                currency,
                path: freshAddressPath,
                derivationMode
              });

              if (finished) return;

              const accountId = `arkjs:2:${currency.id}:${address}:${derivationMode}`;

              let info;
              try {
                info = await api.resource("wallets").get(address);
              } catch (e) {
                const message = e.response
                  ? e.response.data.message
                  : e.message;
                if (message !== 'Wallet not found') {
                  throw e;
                }
              }

              const freshAddress = address;

              if (!info) {
                if (derivationMode === '') {
                  o.next({
                    type: 'Account',
                    id: accountId,
                    xpub: publicKey,
                    seedIdentifier: freshAddress,
                    derivationMode,
                    name: getNewAccountPlaceholderName({ currency, index, derivationMode }),
                    freshAddress,
                    freshAddressPath,
                    balance: BigNumber(0),
                    blockHeight: lastEpoch,
                    index,
                    currency,
                    operations: [],
                    pendingOperations: [],
                    unit: currency.units[0],
                    archived: false,
                    lastSyncDate: new Date(),
                  });
                }
                break;
              }

              if (finished) return;

              const balance = new BigNumber(info.data.data.balance);
              invariant(
                !balance.isNaN() && balance.isFinite(),
                `Ark: invalid balance=${balance.toString()} for address ${address}`,
              );

              const transactions = await api.resource("wallets").transactions(address, {
                orderBy: 'timestamp:desc'
              });

              if (finished) return;

              const account: $Exact<Account> = {
                type: 'Account',
                id: accountId,
                xpub: publicKey,
                seedIdentifier: freshAddress,
                derivationMode,
                name: getAccountPlaceholderName({ currency, index, derivationMode }),
                freshAddress,
                freshAddressPath,
                balance,
                blockHeight: lastEpoch,
                index,
                currency,
                operations: [],
                pendingOperations: [],
                unit: currency.units[0],
                lastSyncDate: new Date(),
              };

              if (transactions) {
                account.operations = transactions.data.data.map(txToOperation(account)).filter(Boolean);
              }

              o.next(account);
            }
          }
          o.complete();
        } catch (e) {
          o.error(e);
        } finally {
          if (transport) {
            transport.close();
          }
        }
      }

      main();

      return unsubscribe;
    }),
};

export const accountBridge: AccountBridge<Transaction> = {
  startSync: (account) =>
    Observable.create(o => {
      let finished = false;
      const unsubscribe = () => {
        finished = true;
      };

      async function main() {
        try {
          const api = apiForEndpointConfig(ArkClient, account.endpointConfig);
          const lastEpoch = await getLastEpoch(api);

          if (finished) return;

          let info;
          try {
            info = await api.resource("wallets").get(account.freshAddress);
          } catch (e) {
            const message = e.response
              ? e.response.data.message
              : e.message;
            if (message !== 'Wallet not found') {
              throw e;
            }
          }
          if (finished) return;

          if (!info) {
            // account does not exist, we have nothing to sync
            o.complete();
            return;
          }

          const balance = new BigNumber(info.data.data.balance);
          invariant(
            !balance.isNaN() && balance.isFinite(),
            `Ark: invalid balance=${balance.toString()} for address ${account.freshAddress}`,
          );

          o.next(a => ({ ...a, balance, blockHeight: lastEpoch }));

          const transactions = await api.resource("wallets").transactions(account.freshAddress, {
            orderBy: 'timestamp:desc'
          });

          if (finished) return;

          o.next(a => {
            const newOps = transactions.data.data.map(txToOperation(a));
            const operations = mergeOps(a.operations, newOps);
            const ids = operations.map(op => op.id);
            const pendingOperations = a.pendingOperations.filter(oo => !ids.includes(oo.id));

            return {
              ...a,
              operations,
              pendingOperations,
              lastSyncDate: new Date()
            };
          });

          o.complete();
        } catch (e) {
          o.error(e);
        }
      }

      main();

      return unsubscribe;
    }),

  fetchTransactionNetworkInfo: async account => {
    const api = apiForEndpointConfig(ArkClient, account.endpointConfig);
    try {
      const { data } = api.resource("node").fees(7);
      const transferFee = data.data.find(fee => fee.type === 0); // Transfer type is 0
      const serverFee = transferFee && transferFee.avg || BigNumber(1e8);
      return {
        serverFee
      };
    } catch (e) {
      if (e.message.includes('Unable to resolve host')) {
        return new NetworkDown();
      }
      throw e;
    }
  },

  pullMoreOperations: () => Promise.resolve(a => a), // FIXME not implemented

  getTransactionNetworkInfo: (account, transaction) => transaction.networkInfo,

  applyTransactionNetworkInfo: (account, transaction, networkInfo) => ({
    ...transaction,
    networkInfo,
    fee: transaction.fee || networkInfo.serverFee,
  }),

  editTransactionAmount: (account, t, amount) => ({
    ...t,
    amount,
  }),

  getTransactionAmount: (a, t) => t.amount,

  editTransactionRecipient: (account, t, recipient) =>
    ({
      ...t,
      recipient,
    }),

  signAndBroadcast: (a, t, deviceId) =>
    Observable.create(o => {
      delete cacheRecipientsNew[t.recipient];
      let cancelled = false;
      const isCancelled = () => cancelled;
      const onSigned = () => {
        o.next({ type: 'signed' });
      };
      const onOperationBroadcasted = operation => {
        o.next({ type: 'broadcasted', operation });
      };
      signAndBroadcast({
        a,
        t,
        deviceId,
        isCancelled,
        onSigned,
        onOperationBroadcasted,
      }).then(
        () => {
          o.complete();
        },
        e => {
          o.error(e);
        },
      );
      return () => {
        cancelled = true;
      };
    }),

  createTransaction: () => ({
    amount: BigNumber(0),
    recipient: '',
    fee: null,
    vendorField: undefined,
    networkInfo: null
  }),

  editTransactionExtra: (a, t, field, value) => {
    switch (field) {
      case 'fee':
        invariant(
          !value || BigNumber.isBigNumber(value),
          "editTransactionExtra(a,t,'fee',value): BigNumber value expected",
        );
        return { ...t, fee: value };

      case 'vendorField':
        invariant(
          !value || typeof value === 'string',
          "editTransactionExtra(a,t,'vendorField',value): string value expected",
        );
        return { ...t, vendorField: value };

      default:
        return t;
    }
  },

  checkValidTransaction: async (a, t) => {
    if (!t.fee) throw new FeeNotLoaded();
    if (
      t.amount
        .plus(t.fee || 0)
        .isLessThanOrEqualTo(a.balance)
    ) {
      return null;
    }
    throw new NotEnoughBalance();
  },

  checkValidRecipient,

  getRecipientWarning: () => Promise.resolve(null),

  getTransactionRecipient: (a, t) => t.recipient,

  getTransactionExtra: (a, t, field) => {
    switch (field) {
      case 'fee':
        return t.fee;

      case 'vendorField':
        return t.vendorField;

      default:
        return undefined;
    }
  },

  getTotalSpent: (a, t) => Promise.resolve(t.amount.plus(t.fee || 0)),

  getMaxAmount: (a, t) => Promise.resolve(a.balance.minus(t.fee || 0)),

  addPendingOperation: (account, operation) => ({
    ...account,
    pendingOperations: [operation].concat(account.pendingOperations),
  }),

  getDefaultEndpointConfig: () => defaultEndpoint,

  validateEndpointConfig: async endpointConfig => {
    const api = apiForEndpointConfig(ArkClient, endpointConfig);
    api.http.setTimeout(4000);
    const response = await api.resource("node").configuration();
    const nethash = response && response.data && response.data.data.nethash;

    if (nethash !== networkNethash) {
      throw new Error("Ark: Invalid nethash");
    }
  }
};