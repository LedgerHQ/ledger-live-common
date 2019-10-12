// @flow
import { Observable } from "rxjs";
import { BigNumber } from "bignumber.js";
import last from "lodash/last";
import type { Transaction } from "../types";
import type { Account, Operation } from "../../../types";
import type { AccountBridge, CurrencyBridge } from "../../../types/bridge";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import {
  derivationModeSupportsIndex,
  getDerivationModesForCurrency,
  isIterableDerivationMode
} from "../../../derivation";
import getAddress from "../../../hw/getAddress";
import { open } from "../../../hw";
import { getAccountPlaceholderName } from "../../../account";
import api, { parseAPIValue } from "./api";
import { getDerivationScheme, runDerivationScheme } from "../../../types";

const getCapabilities = () => ({
  canSync: true,
  canSend: false
});

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice: (currency, deviceId) =>
    Observable.create(o => {
      let emptyCount = 0;
      let finished = false;
      const unsubscribe = () => {
        finished = true;
      };

      async function stepAddress(
        index,
        { path: freshAddressPath, publicKey: freshAddress },
        derivationMode
      ): { account?: Account, complete?: boolean } {
        if (finished) return;
        let accountResult;
        let balance = new BigNumber(0);

        try {
          accountResult = await api.getServer().loadAccount(freshAddress);
          balance = api.getBalanceFromAccount(accountResult);
        } catch (e) {
          // Server throws if the account doesn't exist
          emptyCount++;
        }

        const accountId = `stellarjs:2:${currency.id}:${freshAddress}:${derivationMode}`;

        const account: Account = {
          type: "Account",
          id: accountId,
          derivationMode,
          xpub: "",
          name: getAccountPlaceholderName({
            currency,
            index,
            derivationMode
          }),
          seedIdentifier: freshAddress,
          freshAddress,
          freshAddressPath,
          freshAddresses: [
            {
              address: freshAddress,
              derivationPath: freshAddressPath
            }
          ],
          balance,
          blockHeight: 0,
          index,
          currency,
          operations: [],
          pendingOperations: [],
          unit: currency.units[0],
          lastSyncDate: new Date()
        };
        return { account };
      }

      async function main() {
        const transport = await open(deviceId);
        try {
          const derivationMode = getDerivationModesForCurrency(currency)[0];
          const derivationScheme = getDerivationScheme({
            derivationMode,
            currency
          });
          const stopAt = isIterableDerivationMode(derivationMode) ? 255 : 1;
          for (let index = 0; index < stopAt; index++) {
            if (!derivationModeSupportsIndex(derivationMode, index)) continue;
            const freshAddressPath = runDerivationScheme(
              derivationScheme,
              currency,
              {
                account: index
              }
            );
            const res = await getAddress(transport, {
              currency,
              path: freshAddressPath,
              derivationMode
            });
            if (finished) return;

            const r = await stepAddress(index, res, derivationMode);

            if (r.account) {
              o.next({ type: "discovered", account: r.account });
            }

            if (emptyCount > 0) {
              console.log("cant find anything else");
              finished = true;
            }
          }
          o.complete();
        } catch (e) {
          o.error(e);
        } finally {
          if (transport) transport.close();
        }
      }

      main();

      return unsubscribe;
    })
};

const mergeOps = (existing: Operation[], newFetched: Operation[]) => {
  const ids = existing.map(o => o.id);
  const all = existing.concat(newFetched.filter(o => !ids.includes(o.id)));
  return all.sort((a, b) => b.date - a.date);
};

const paymentsToOperation = async (id, payments, currency, account) => {
  const parsedPayments = [];
  for (const payment of payments) {
    let from;
    let to;
    let value;

    if (payment.type === "create_account") {
      from = payment.funder;
      to = payment.account;
      value = parseAPIValue(payment.starting_balance);
    } else {
      from = payment.from;
      to = payment.to;
      value = parseAPIValue(payment.amount);
    }

    const operation: Operation = {
      id: payment.id,
      hash: payment.transaction_hash,
      type: account === from ? "OUT" : "IN",
      accountId: id,
      value,
      fee: new BigNumber(100),
      blockHash: payment.transaction_hash,
      blockHeight: +payment.paging_token,
      senders: [from],
      recipients: [to],
      date: new Date(payment.created_at),
      transactionSequenceNumber: payment.transaction_hash,
      extra: {}
    };

    if (payment.type === "create_account") {
      operation.senders = [payment.funder];
      operation.recipients = [payment.account];
    }

    parsedPayments.push(operation);
  }
  return parsedPayments;
};

const startSync = ({ id, freshAddress, blockHeight, currency }) =>
  Observable.create(o => {
    let unsubscribed = false;
    let balance;
    const server = api.getServer()

    async function main(_blockHeight) {
      console.log({ id, freshAddress, blockHeight, currency })
      if (unsubscribed) return;
      const payments = await server
        .payments()
        .cursor(_blockHeight)
        .forAccount(freshAddress)
        .order("asc")
        .limit(100)
        .call();

      const newOperations = [];
      if (
        payments.records.length &&
        last(payments.records).paging_token > _blockHeight
      ) {
        newOperations.push(
          ...(await paymentsToOperation(
            id,
            payments.records,
            currency,
            freshAddress
          ))
        );
        _blockHeight = last(newOperations).blockHeight;

        o.next(a => ({
          ...a,
          operations: mergeOps(a.operations, newOperations),
          _blockHeight
        }));
      } else {
        const lastLedger = await api.getLastLedger();

        o.next(a => ({
          ...a,
          balance,
          blockHeight: +lastLedger.records[0].paging_token,
          pendingOperations: []
        }));
        o.complete();
      }
    }
    main(blockHeight);

    return () => {
      unsubscribed = true;
    };
  });

const accountBridge: AccountBridge<Transaction> = {
  createTransaction: () => null,
  updateTransaction: () => null,
  prepareTransaction: () => null,
  getTransactionStatus: () => null,
  signAndBroadcast: () => null,
  startSync,
  getCapabilities,
  ...inferDeprecatedMethods({
    name: "StellarJSBridge",
    createTransaction: () => null,
    getTransactionStatus: () => null,
    prepareTransaction: () => null,
    fillUpExtraFieldToApplyTransactionNetworkInfo: () => null
  })
};

export default { currencyBridge, accountBridge };
