/* eslint-disable no-console */
// @flow

import "babel-polyfill";
import { BigNumber } from "bignumber.js";
import type { Account } from "@ledgerhq/live-common/lib/types";
import {
  fromAccountRaw,
  toAccountRaw,
  decodeAccountId,
  encodeAccountId
} from "@ledgerhq/live-common/lib/account";
import {
  fromTransactionRaw,
  toTransactionRaw
} from "@ledgerhq/live-common/lib/transaction";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import setupTest from "../live-common-setup-test";
import accountsJSON from "./libcoreAccounts.json";

setupTest("accountBridges");
const ethereum1: Account = fromAccountRaw(accountsJSON.ethereum1);
const xrp1: Account = fromAccountRaw(accountsJSON.xrp1);
const bitcoin1: Account = fromAccountRaw(accountsJSON.bitcoin1);

// covers all bridges through many different accounts
// to test the common shared properties of bridges.
[
  ethereum1,
  xrp1,
  bitcoin1,
  switchAccountBridge(ethereum1, "ethereumjs"),
  switchAccountBridge(xrp1, "ripplejs", "2"),
  switchAccountBridge(ethereum1, "mock"),
  switchAccountBridge(xrp1, "mock"),
  switchAccountBridge(bitcoin1, "mock")
]
  .map(account => {
    const bridge = getAccountBridge(account, null);
    const accountSyncedPromise = bridge
      .startSync(account, false)
      .toPromise()
      .then(f => f(account));
    return [accountSyncedPromise, bridge, account];
  })
  .forEach(([accountPromise, bridge, initialAccount]) => {
    describe("shared properties on: " + initialAccount.id, () => {
      describe("startSync", () => {
        test("succeed", async () => {
          const account = await accountPromise;
          expect(fromAccountRaw(toAccountRaw(account))).toBeDefined();
        });
      });

      describe("createTransaction", () => {
        test("empty transaction is an object with empty recipient and zero amount", () => {
          expect(bridge.createTransaction(initialAccount)).toMatchObject({
            amount: BigNumber(0),
            recipient: ""
          });
        });

        test("empty transaction is equals to itself", () => {
          expect(bridge.createTransaction(initialAccount)).toEqual(
            bridge.createTransaction(initialAccount)
          );
        });

        test("empty transaction correctly serialize", () => {
          const t = bridge.createTransaction(initialAccount);
          expect(fromTransactionRaw(toTransactionRaw(t))).toEqual(t);
        });

        test("transaction with amount and recipient correctly serialize", async () => {
          const account = await accountPromise;
          const t = {
            ...bridge.createTransaction(account),
            amount: BigNumber(1000),
            recipient: account.freshAddress
          };
          expect(fromTransactionRaw(toTransactionRaw(t))).toEqual(t);
        });
      });

      describe("prepareTransaction", () => {
        // stability: function called twice will return the same object reference (=== convergence so we can stop looping, typically because transaction will be a hook effect dependency of prepareTransaction)
        async function expectStability(account, t) {
          const t2 = await bridge.prepareTransaction(account, t);
          const t3 = await bridge.prepareTransaction(account, t2);
          expect(t2).toBe(t3);
        }

        test("ref stability on empty transaction", async () => {
          const account = await accountPromise;
          await expectStability(account, bridge.createTransaction(account));
        });

        test("ref stability on self transaction", async () => {
          const account = await accountPromise;
          await expectStability(account, {
            ...bridge.createTransaction(account),
            amount: BigNumber(1000),
            recipient: account.freshAddress
          });
        });

        test("can be run in parallel and all yield same results", async () => {
          const account = await accountPromise;
          const t = {
            ...bridge.createTransaction(account),
            amount: BigNumber(1000),
            recipient: account.freshAddress
          };
          const first = await bridge.prepareTransaction(account, t);
          const concur = await Promise.all(
            Array(3)
              .fill(null)
              .map(() => bridge.prepareTransaction(account, t))
          );
          concur.forEach(r => {
            expect(r).toEqual(first);
          });
        });
      });

      describe("getTransactionStatus", () => {
        test("can be called on an empty transaction", async () => {
          const account = await accountPromise;
          const t = bridge.createTransaction(account);
          const s = await bridge.getTransactionStatus(account, t);
          expect(s).toBeDefined();
          expect(s).toHaveProperty("recipientError");
          expect(s).toHaveProperty("recipientWarning");
          expect(s).toHaveProperty("showFeeWarning");
          expect(s).toHaveProperty("transactionError");
          expect(typeof s.showFeeWarning).toBe("boolean");
          expect(s).toHaveProperty("totalSpent");
          expect(s.totalSpent).toBeInstanceOf(BigNumber);
          expect(s).toHaveProperty("estimatedFees");
          expect(s.estimatedFees).toBeInstanceOf(BigNumber);
          expect(s).toHaveProperty("amount");
          expect(s.amount).toBeInstanceOf(BigNumber);
          expect(s.amount).toEqual(BigNumber(0));
          expect(s).toHaveProperty("useAllAmount");
          expect(typeof s.useAllAmount).toBe("boolean");
          expect(s.useAllAmount).toBe(false);
        });

        test("can be called on an empty prepared transaction", async () => {
          const account = await accountPromise;
          const t = await bridge.prepareTransaction(
            account,
            bridge.createTransaction(account)
          );
          const s = await bridge.getTransactionStatus(account, t);
          expect(s).toBeDefined();
          // FIXME i'm not sure if we can establish more shared properties
        });

        test("can be called on a prepared self transaction", async () => {
          const account = await accountPromise;
          const t = await bridge.prepareTransaction(account, {
            ...bridge.createTransaction(account),
            amount: BigNumber(1000),
            recipient: account.freshAddress
          });
          const s = await bridge.getTransactionStatus(account, t);
          expect(s).toBeDefined();
          // FIXME i'm not sure if we can establish more shared properties
        });
      });

      describe("signAndBroadcast", () => {
        test("method is available on bridge", async () => {
          expect(typeof bridge.signAndBroadcast).toBe("function");
        });

        // NB for now we are not going farther because most is covered by bash tests
      });
    });
  });

function switchAccountBridge(account, type, version = "1") {
  return {
    ...account,
    id: encodeAccountId({
      ...decodeAccountId(account.id),
      type,
      version
    })
  };
}
