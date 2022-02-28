/* eslint-disable no-param-reassign */
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import bs58check from "ripple-bs58check";
import {
  AmountRequired,
  NotEnoughBalanceBecauseDestinationNotCreated,
  NotEnoughSpendableBalance,
  InvalidAddress,
  FeeNotLoaded,
  FeeTooHigh,
  NetworkDown,
  InvalidAddressBecauseDestinationIsAlsoSource,
  FeeRequired,
  RecipientRequired,
} from "@ledgerhq/errors";
import type { Account, Operation, SignOperationEvent } from "../../../types";
import {
  getDerivationModesForCurrency,
  getDerivationScheme,
  runDerivationScheme,
  isIterableDerivationMode,
  derivationModeSupportsIndex,
} from "../../../derivation";
import { formatCurrencyUnit } from "../../../currencies";
import { patchOperationWithHash } from "../../../operation";
import { getMainAccount } from "../../../account";
import {
  getAccountPlaceholderName,
  getNewAccountPlaceholderName,
  emptyHistoryCache,
} from "../../../account";
import getAddress from "../../../hw/getAddress";
import { open, close } from "../../../hw";
import type { CurrencyBridge, AccountBridge } from "../../../types/bridge";
import signTransaction from "../../../hw/signTransaction";
import type { Transaction, NetworkInfo } from "../types";
import { makeAccountBridgeReceive, mergeOps } from "../../../bridge/jsHelpers";
import {
  submit,
  getAccountInfo,
  getServerInfo,
  getTransactions,
  parseAPIValue,
} from "../../../api/Ripple";

const NEW_ACCOUNT_ERROR_MESSAGE = "actNotFound";

// true if the error should be forwarded and is not a "not found" case
const checkAccountNotFound = (e) => {
  return (
    !e.data ||
    (e.message !== NEW_ACCOUNT_ERROR_MESSAGE &&
      e.data.error !== NEW_ACCOUNT_ERROR_MESSAGE)
  );
};

const receive = makeAccountBridgeReceive();

const getSequenceNumber = async (account) => {
  const lastOp = account.operations.find((op) => op.type === "OUT");

  if (lastOp && lastOp.transactionSequenceNumber) {
    return (
      lastOp.transactionSequenceNumber + account.pendingOperations.length + 1
    );
  }

  const info = await getAccountInfo(account.freshAddress);
  return info.sequence + account.pendingOperations.length;
};

const uint32maxPlus1 = new BigNumber(2).pow(32);

const validateTag = (tag) => {
  return (
    !tag.isNaN() &&
    tag.isFinite() &&
    tag.isInteger() &&
    tag.isPositive() &&
    tag.lt(uint32maxPlus1)
  );
};

const signOperation = ({
  account,
  transaction,
  deviceId,
}): Observable<SignOperationEvent> =>
  new Observable((o) => {
    delete cacheRecipientsNew[transaction.recipient];
    const { fee } = transaction;
    if (!fee) throw new FeeNotLoaded();

    async function main() {
      try {
        const tag = transaction.tag ? transaction.tag : undefined;
        const payment = {
          TransactionType: "Payment",
          Account: account.freshAddress,
          Amount: transaction.amount.toString(),
          Destination: transaction.recipient,
          DestinationTag: tag,
          Fee: fee.toString(),
          Flags: 2147483648,
          Sequence: await getSequenceNumber(account),
          LastLedgerSequence: account.blockHeight + 20,
        };
        if (tag)
          invariant(
            validateTag(new BigNumber(tag)),
            `tag is set but is not in a valid format, should be between [0 - ${uint32maxPlus1
              .minus(1)
              .toString()}]`
          );
        let signature;
        const transport = await open(deviceId);

        try {
          o.next({
            type: "device-signature-requested",
          });
          signature = await signTransaction(
            account.currency,
            transport,
            account.freshAddressPath,
            payment
          );
          o.next({
            type: "device-signature-granted",
          });
        } finally {
          close(transport, deviceId);
        }

        const hash = "";
        const operation: Operation = {
          id: `${account.id}-${hash}-OUT`,
          hash,
          accountId: account.id,
          type: "OUT",
          value: transaction.amount,
          fee,
          blockHash: null,
          blockHeight: null,
          senders: [account.freshAddress],
          recipients: [transaction.recipient],
          date: new Date(),
          // we probably can't get it so it's a predictive value
          transactionSequenceNumber: await getSequenceNumber(account),
          extra: {} as any,
        };

        if (transaction.tag) {
          operation.extra.tag = transaction.tag;
        }

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature,
            expirationDate: null,
          },
        });
      } catch (e: any) {
        if (e && e.name === "RippledError" && e.data.resultMessage) {
          throw new Error(e.data.resultMessage);
        }

        throw e;
      }
    }

    main().then(
      () => o.complete(),
      (e) => o.error(e)
    );
  });

const broadcast = async ({ signedOperation: { signature, operation } }) => {
  const submittedPayment = await submit(signature);

  if (
    submittedPayment.engine_result !== "tesSUCCESS" &&
    submittedPayment.engine_result !== "terQUEUED"
  ) {
    throw new Error(submittedPayment.engine_result_message);
  }

  const { hash } = submittedPayment.tx_json;
  return patchOperationWithHash(operation, hash);
};

function isRecipientValid(recipient) {
  try {
    bs58check.decode(recipient);
    return true;
  } catch (e) {
    return false;
  }
}

interface Currency {
  currency: string;
  amount: string;
}

interface TxXRPL {
  meta: {
    TransactionResult: string;
    delivered_amount: Currency | string;
  };
  tx: {
    TransactionType: string;
    Fee: string;
    Account: string;
    Destination: string;
    DestinationTag?: number;
    Amount: string;
    Sequence: number;
    date: number;
    inLedger: number;
    hash: string;
  };
}

const filterOperations: any = (transactions: TxXRPL[], account: Account) => {
  return transactions
    .filter(
      (tx: TxXRPL) =>
        tx.tx.TransactionType === "Payment" &&
        typeof tx.meta.delivered_amount === "string"
    )
    .map(txToOperation(account))
    .filter(Boolean);
};

const txToOperation =
  (account: Account) =>
  ({
    meta: { delivered_amount },
    tx: {
      DestinationTag,
      Fee,
      hash,
      inLedger,
      date,
      Account,
      Destination,
      Sequence,
    },
  }: TxXRPL): Operation | null | undefined => {
    const type = Account === account.freshAddress ? "OUT" : "IN";
    let value =
      delivered_amount && typeof delivered_amount === "string"
        ? new BigNumber(delivered_amount)
        : new BigNumber(0);
    const feeValue = new BigNumber(Fee);

    if (type === "OUT") {
      if (!Number.isNaN(feeValue)) {
        value = value.plus(feeValue);
      }
    }

    const op: Operation = {
      id: `${account.id}-${hash}-${type}`,
      hash: hash,
      accountId: account.id,
      type,
      value,
      fee: feeValue,
      blockHash: null,
      blockHeight: inLedger,
      senders: [Account],
      recipients: [Destination],
      date: new Date(date),
      transactionSequenceNumber: Sequence,
      extra: {},
    };

    if (DestinationTag) {
      op.extra.tag = DestinationTag;
    }

    return op;
  };

const recipientIsNew = async (recipient: string) => {
  if (!isRecipientValid(recipient)) return false;

  try {
    const info = await getAccountInfo(recipient);
    if (info.error === NEW_ACCOUNT_ERROR_MESSAGE) {
      return true;
    }
    return false;
  } catch (e) {
    if (checkAccountNotFound(e)) {
      throw e;
    }

    return true;
  }
};

// FIXME this could be cleaner
const remapError = (error) => {
  const msg = error.message;

  if (
    msg.includes("Unable to resolve host") ||
    msg.includes("Network is down")
  ) {
    return new NetworkDown();
  }

  return error;
};

const cacheRecipientsNew = {};

const cachedRecipientIsNew = (recipient: string) => {
  if (recipient in cacheRecipientsNew) return cacheRecipientsNew[recipient];
  cacheRecipientsNew[recipient] = recipientIsNew(recipient);
  return cacheRecipientsNew[recipient];
};

const currencyBridge: CurrencyBridge = {
  preload: () => Promise.resolve({}),
  hydrate: () => {},
  scanAccounts: ({ currency, deviceId }) =>
    new Observable((o) => {
      let finished = false;

      const unsubscribe = () => {
        finished = true;
      };

      async function main() {
        let transport;

        try {
          transport = await open(deviceId);
          const serverInfo = await getServerInfo();
          const ledgers = serverInfo.info.complete_ledgers.split("-");
          const minLedgerVersion = Number(ledgers[0]);
          const maxLedgerVersion = Number(ledgers[1]);
          const derivationModes = getDerivationModesForCurrency(currency);

          for (const derivationMode of derivationModes) {
            const derivationScheme = getDerivationScheme({
              derivationMode,
              currency,
            });
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
              const { address } = await getAddress(transport, {
                currency,
                path: freshAddressPath,
                derivationMode,
              });
              if (finished) return;
              const accountId = `ripplejs:2:${currency.id}:${address}:${derivationMode}`;
              let info;

              try {
                info = await getAccountInfo(address);
              } catch (e) {
                if (checkAccountNotFound(e)) {
                  throw e;
                }
              }

              // fresh address is address. ripple never changes.
              const freshAddress = address;

              if (info.error === NEW_ACCOUNT_ERROR_MESSAGE) {
                // account does not exist in Ripple server
                // we are generating a new account locally
                if (derivationMode === "") {
                  o.next({
                    type: "discovered",
                    account: {
                      type: "Account",
                      id: accountId,
                      seedIdentifier: freshAddress,
                      derivationMode,
                      name: getNewAccountPlaceholderName({
                        currency,
                        index,
                        derivationMode,
                      }),
                      starred: false,
                      used: false,
                      freshAddress,
                      freshAddressPath,
                      freshAddresses: [
                        {
                          address: freshAddress,
                          derivationPath: freshAddressPath,
                        },
                      ],
                      balance: new BigNumber(0),
                      spendableBalance: new BigNumber(0),
                      blockHeight: maxLedgerVersion,
                      index,
                      currency,
                      operationsCount: 0,
                      operations: [],
                      pendingOperations: [],
                      unit: currency.units[0],
                      // @ts-expect-error archived does not exists on type Account
                      archived: false,
                      lastSyncDate: new Date(),
                      creationDate: new Date(),
                      swapHistory: [],
                      balanceHistoryCache: emptyHistoryCache, // calculated in the jsHelpers
                    },
                  });
                }

                break;
              }

              if (finished) return;
              const balance = new BigNumber(info.account_data.Balance);
              invariant(
                !balance.isNaN() && balance.isFinite(),
                `Ripple: invalid balance=${balance.toString()} for address ${address}`
              );
              const transactions = (
                await getTransactions(freshAddress, {
                  ledger_index_min: minLedgerVersion,
                  ledger_index_max: maxLedgerVersion,
                })
              ).transactions;
              if (finished) return;
              const account: Account = {
                type: "Account",
                id: accountId,
                seedIdentifier: freshAddress,
                derivationMode,
                name: getAccountPlaceholderName({
                  currency,
                  index,
                  derivationMode,
                }),
                starred: false,
                used: true,
                freshAddress,
                freshAddressPath,
                freshAddresses: [
                  {
                    address: freshAddress,
                    derivationPath: freshAddressPath,
                  },
                ],
                balance,
                spendableBalance: balance,
                // TODO calc with base reserve
                blockHeight: maxLedgerVersion,
                index,
                currency,
                operationsCount: 0,
                operations: [],
                pendingOperations: [],
                unit: currency.units[0],
                lastSyncDate: new Date(),
                creationDate: new Date(),
                swapHistory: [],
                balanceHistoryCache: emptyHistoryCache, // calculated in the jsHelpers
              };
              account.operations = filterOperations(transactions, account);
              account.operationsCount = account.operations.length;

              if (account.operations.length > 0) {
                account.creationDate =
                  account.operations[account.operations.length - 1].date;
              }

              o.next({
                type: "discovered",
                account,
              });
            }
          }

          o.complete();
        } catch (e) {
          o.error(e);
        } finally {
          if (transport) {
            await close(transport, deviceId);
          }
        }
      }

      main();
      return unsubscribe;
    }),
};

const sync = ({
  endpointConfig,
  freshAddress,
  blockHeight,
  operations,
}: any): Observable<(arg0: Account) => Account> =>
  new Observable((o) => {
    let finished = false;
    const currentOpsLength = operations ? operations.length : 0;

    const unsubscribe = () => {
      finished = true;
    };

    async function main() {
      try {
        if (finished) return;
        const serverInfo = await getServerInfo(endpointConfig);
        if (finished) return;

        const ledgers = serverInfo.info.complete_ledgers.split("-");
        const minLedgerVersion = Number(ledgers[0]);
        const maxLedgerVersion = Number(ledgers[1]);
        let info;

        try {
          info = await getAccountInfo(freshAddress);
        } catch (e) {
          if (checkAccountNotFound(e)) {
            throw e;
          }
        }

        if (finished) return;

        if (!info || info.error === NEW_ACCOUNT_ERROR_MESSAGE) {
          // account does not exist, we have nothing to sync but to update the last sync date
          o.next((a) => ({ ...a, lastSyncDate: new Date() }));
          o.complete();
          return;
        }

        const balance = new BigNumber(info.account_data.Balance);
        invariant(
          !balance.isNaN() && balance.isFinite(),
          `Ripple: invalid balance=${balance.toString()} for address ${freshAddress}`
        );
        const transactions = (
          await getTransactions(freshAddress, {
            ledger_index_min: Math.max(
              currentOpsLength === 0 ? 0 : blockHeight, // if there is no ops, it might be after a clear and we prefer to pull from the oldest possible history
              minLedgerVersion
            ),
            ledger_index_max: maxLedgerVersion,
          })
        ).transactions;
        if (finished) return;
        o.next((a) => {
          const newOps = filterOperations(transactions, a);
          const operations = mergeOps(a.operations, newOps);
          const [last] = operations;
          const pendingOperations = a.pendingOperations.filter(
            (oo) =>
              !operations.some((op) => oo.hash === op.hash) &&
              last &&
              last.transactionSequenceNumber &&
              oo.transactionSequenceNumber &&
              oo.transactionSequenceNumber > last.transactionSequenceNumber
          );
          return {
            ...a,
            balance,
            spendableBalance: balance,
            // TODO use reserve
            operations,
            pendingOperations,
            blockHeight: maxLedgerVersion,
            lastSyncDate: new Date(),
          };
        });
        o.complete();
      } catch (e) {
        o.error(remapError(e));
      }
    }

    main();
    return unsubscribe;
  });

const createTransaction = (): Transaction => ({
  family: "ripple",
  amount: new BigNumber(0),
  recipient: "",
  fee: null,
  tag: undefined,
  networkInfo: null,
  feeCustomUnit: null,
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const prepareTransaction = async (a: Account, t: Transaction) => {
  let networkInfo: NetworkInfo | null | undefined = t.networkInfo;

  if (!networkInfo) {
    try {
      const info = await getServerInfo(a.endpointConfig);
      const serverFee = parseAPIValue(
        info.info.validated_ledger.base_fee_xrp.toString()
      );
      networkInfo = {
        family: "ripple",
        serverFee,
        baseReserve: new BigNumber(0), // NOT USED. will refactor later.
      };
    } catch (e) {
      throw remapError(e);
    }
  }

  const fee = t.fee || networkInfo.serverFee;

  if (t.networkInfo !== networkInfo || t.fee !== fee) {
    return { ...t, networkInfo, fee };
  }

  return t;
};

const getTransactionStatus = async (a, t) => {
  const errors: {
    fee?: Error;
    amount?: Error;
    recipient?: Error;
  } = {};
  const warnings: {
    feeTooHigh?: Error;
  } = {};
  const r = await getServerInfo(a.endpointConfig);
  const reserveBaseXRP = parseAPIValue(
    r.info.validated_ledger.reserve_base_xrp.toString()
  );
  const estimatedFees = new BigNumber(t.fee || 0);
  const totalSpent = new BigNumber(t.amount).plus(estimatedFees);
  const amount = new BigNumber(t.amount);

  if (amount.gt(0) && estimatedFees.times(10).gt(amount)) {
    warnings.feeTooHigh = new FeeTooHigh();
  }

  if (!t.fee) {
    errors.fee = new FeeNotLoaded();
  } else if (t.fee.eq(0)) {
    errors.fee = new FeeRequired();
  } else if (totalSpent.gt(a.balance.minus(reserveBaseXRP))) {
    errors.amount = new NotEnoughSpendableBalance("", {
      minimumAmount: formatCurrencyUnit(a.currency.units[0], reserveBaseXRP, {
        disableRounding: true,
        useGrouping: false,
        showCode: true,
      }),
    });
  } else if (
    t.recipient &&
    (await cachedRecipientIsNew(t.recipient)) &&
    t.amount.lt(reserveBaseXRP)
  ) {
    errors.amount = new NotEnoughBalanceBecauseDestinationNotCreated("", {
      minimalAmount: formatCurrencyUnit(a.currency.units[0], reserveBaseXRP, {
        disableRounding: true,
        useGrouping: false,
        showCode: true,
      }),
    });
  }

  if (!t.recipient) {
    errors.recipient = new RecipientRequired("");
  } else if (a.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else {
    try {
      bs58check.decode(t.recipient);
    } catch (e) {
      errors.recipient = new InvalidAddress("", {
        currencyName: a.currency.name,
      });
    }
  }

  if (!errors.amount && amount.eq(0)) {
    errors.amount = new AmountRequired();
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  });
};

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const r = await getServerInfo(mainAccount.endpointConfig);
  const reserveBaseXRP = new BigNumber(
    r.info.validated_ledger.reserve_base_xrp
  );
  const t = await prepareTransaction(mainAccount, {
    ...createTransaction(),
    ...transaction,
    recipient: transaction?.recipient || "rHsMGQEkVNJmpGWs8XUBoTBiAAbwxZN5v3",
    // public testing seed abandonx11,about
    amount: new BigNumber(0),
  });
  const s = await getTransactionStatus(mainAccount, t);
  return BigNumber.max(
    0,
    account.balance.minus(reserveBaseXRP).minus(s.estimatedFees)
  );
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  estimateMaxSpendable,
  sync,
  receive,
  signOperation,
  broadcast,
};
export default {
  currencyBridge,
  accountBridge,
};
