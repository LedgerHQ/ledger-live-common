// @flow
import invariant from "invariant";
import now from "performance-now";
import sample from "lodash/sample";
import { throwError, of, Observable } from "rxjs";
import {
  first,
  filter,
  map,
  reduce,
  tap,
  mergeMap,
  timeoutWith,
} from "rxjs/operators";
import { log } from "@ledgerhq/logs";
import type {
  TransactionStatus,
  Transaction,
  Account,
  Operation,
  SignOperationEvent,
  CryptoCurrency,
} from "../types";
import { getCurrencyBridge, getAccountBridge } from "../bridge";
import { promiseAllBatched } from "../promise";
import { isAccountEmpty, formatAccount } from "../account";
import { getEnv } from "../env";
import { delay } from "../promise";
import {
  listAppCandidates,
  createSpeculosDevice,
  releaseSpeculosDevice,
  findAppCandidate,
} from "../load/speculos";
import deviceActions from "../generated/speculos-deviceActions";
import type { AppCandidate } from "../load/speculos";
import {
  formatReportForConsole,
  formatTime,
  formatAppCandidate,
} from "./formatters";
import type {
  AppSpec,
  SpecReport,
  MutationReport,
  DeviceAction,
} from "./types";

let appCandidates;

export async function runWithAppSpec<T: Transaction>(
  spec: AppSpec<T>,
  reportLog: (string) => void
): Promise<SpecReport<T>> {
  log("engine", `spec ${spec.name}`);

  const seed = getEnv("SEED");
  invariant(seed, "SEED is not set");

  const coinapps = getEnv("COINAPPS");
  invariant(coinapps, "COINAPPS is not set");

  if (!appCandidates) {
    appCandidates = await listAppCandidates(coinapps);
  }
  const mutationReports: MutationReport<T>[] = [];

  const { appQuery, currency, dependency } = spec;

  const appCandidate = findAppCandidate(appCandidates, appQuery);
  invariant(
    appCandidate,
    "%s: no app found. Are you sure your COINAPPS is up to date?",
    spec.name,
    coinapps
  );

  log(
    "engine",
    `spec ${spec.name} will use ${formatAppCandidate(appCandidate)}`
  );
  const deviceParams = {
    ...appCandidate,
    appName: spec.currency.managerAppName,
    seed,
    dependency,
    coinapps,
  };
  let device;

  const appReport: SpecReport<T> = { spec };

  try {
    device = await createSpeculosDevice(deviceParams);

    const bridge = getCurrencyBridge(currency);
    const syncConfig = { paginationConfig: {} };

    let t = now();
    await bridge.preload();
    const preloadTime = now() - t;

    // Scan all existing accounts
    t = now();
    let scanTime = 0;
    const firstSyncDurations = {};
    let accounts = await bridge
      .scanAccounts({ currency, deviceId: device.id, syncConfig })
      .pipe(
        filter((e) => e.type === "discovered"),
        map((e) => e.account),
        tap((account) => {
          const dt = now() - t;
          firstSyncDurations[account.id] = dt;
          t = now();
          scanTime += dt;
        }),
        reduce<Account>((all, a) => all.concat(a), []),
        timeoutWith(
          15 * 60 * 1000,
          throwError(
            new Error("scan accounts timeout for currency " + currency.name)
          )
        )
      )
      .toPromise();

    appReport.scanTime = scanTime;
    appReport.accountsBefore = accounts;

    invariant(
      accounts.length > 0,
      "unexpected empty accounts for " + currency.name
    );

    const preloadStats =
      preloadTime > 10 ? ` (preload: ${formatTime(preloadTime)})` : "";
    reportLog(
      `Spec ${spec.name} found ${accounts.length} ${
        currency.name
      } accounts${preloadStats}. Will use ${formatAppCandidate(
        appCandidate
      )}\n${accounts
        .map(
          (a) =>
            "(" +
            formatTime(firstSyncDurations[a.id] || 0) +
            ") " +
            formatAccount(a, "summary")
        )
        .join("\n")}\n`
    );

    if (accounts.every(isAccountEmpty)) {
      reportLog(
        `This SEED does not have ${
          currency.name
        }. Please send funds to ${accounts
          .map((a) => a.freshAddress)
          .join(" or ")}\n`
      );
      appReport.accountsAfter = accounts;
      return appReport;
    }

    const mutationsCount = {};
    // we sequentially iterate on the initial account set to perform mutations
    const length = accounts.length;
    for (let i = 0; i < length; i++) {
      log("engine", `spec ${spec.name} sync all accounts`);
      // resync all accounts (necessary between mutations)
      t = now();
      accounts = await promiseAllBatched(5, accounts, syncAccount);
      appReport.accountsAfter = accounts;
      const syncAllAccountsTime = now() - t;
      const account = accounts[i];
      const report = await runOnAccount({
        appCandidate,
        spec,
        device,
        account,
        accounts,
        mutationsCount,
        syncAllAccountsTime,
      });
      reportLog(formatReportForConsole(report));
      mutationReports.push(report);

      if (
        report.error ||
        (report.latestSignOperationEvent &&
          report.latestSignOperationEvent.type === "device-signature-requested")
      ) {
        log(
          "engine",
          `spec ${spec.name} is recreating the device because deviceAction didn't finished`
        );
        await releaseSpeculosDevice(device.id);
        device = await createSpeculosDevice(deviceParams);
      }
    }
    accounts = await promiseAllBatched(5, accounts, syncAccount);

    appReport.mutations = mutationReports;
    appReport.accountsAfter = accounts;
  } catch (e) {
    appReport.fatalError = e;
    log("engine", `spec ${spec.name} failed with ${String(e)}`);
  } finally {
    log("engine", `spec ${spec.name} finished`);
    if (device) await releaseSpeculosDevice(device.id);
  }

  return appReport;
}

export async function runOnAccount<T: Transaction>({
  appCandidate,
  spec,
  device,
  account,
  accounts,
  mutationsCount,
  syncAllAccountsTime,
}: {
  appCandidate: *,
  spec: AppSpec<T>,
  device: *,
  account: *,
  accounts: *,
  mutationsCount: { [_: string]: number },
  syncAllAccountsTime: number,
}): Promise<MutationReport<T>> {
  const { mutations } = spec;

  let latestSignOperationEvent;
  let report: MutationReport<T> = { spec, appCandidate, syncAllAccountsTime };
  try {
    const accountBridge = getAccountBridge(account);
    const accountBeforeTransaction = account;
    report.account = account;

    log("engine", `spec ${spec.name}/${account.name}`);

    const maxSpendable = await accountBridge.estimateMaxSpendable({ account });
    report.maxSpendable = maxSpendable;
    log(
      "engine",
      `spec ${spec.name}/${
        account.name
      } maxSpendable=${maxSpendable.toString()}`
    );

    const candidates = [];
    const unavailableMutationReasons = [];

    for (const mutation of mutations) {
      try {
        const count = mutationsCount[mutation.name] || 0;
        invariant(
          count < (mutation.maxRun || Infinity),
          "maximum mutation run reached (%s)",
          count
        );
        const tx = mutation.transaction({
          appCandidate,
          account,
          bridge: accountBridge,
          siblings: accounts.filter((a) => a !== account),
          maxSpendable,
        });
        if (tx) {
          candidates.push({ mutation, tx });
        }
      } catch (e) {
        unavailableMutationReasons.push(mutation.name + ": " + e.message);
      }
    }

    const candidate = sample(candidates);

    if (!candidate) {
      // no mutation were suitable
      report.unavailableMutationReasons = unavailableMutationReasons;
      return report;
    }

    // a mutation was chosen
    const { tx, mutation } = candidate;
    report.mutation = mutation;
    report.transaction = tx;
    report.destination = accounts.find((a) => a.freshAddress === tx.recipient);
    mutationsCount[mutation.name] = (mutationsCount[mutation.name] || 0) + 1;

    // prepare the transaction and ensure it's valid
    const transaction = await accountBridge.prepareTransaction(account, tx);
    report.transaction = transaction;
    report.transactionTime = now();

    const status = await accountBridge.getTransactionStatus(
      account,
      transaction
    );
    report.status = status;
    report.statusTime = now();

    const errors = Object.values(status.errors);
    if (errors.length) {
      // FIXME more errors to be included?
      throw errors[0];
    }

    // sign the transaction with speculos

    log("engine", `spec ${spec.name}/${account.name} signing`);
    const signedOperation = await accountBridge
      .signOperation({ account, transaction, deviceId: device.id })
      .pipe(
        tap((e) => {
          latestSignOperationEvent = e;
          log("engine", `spec ${spec.name}/${account.name}: ${e.type}`);
        }),
        autoSignTransaction({
          transport: device.transport,
          deviceAction:
            mutation.deviceAction || getImplicitDeviceAction(account.currency),
          appCandidate,
          account,
          transaction,
          status,
        }),
        first((e) => e.type === "signed"),
        map(
          (e) => (
            invariant(e.type === "signed", "signed operation"),
            e.signedOperation
          )
        )
      )
      .toPromise();
    report.signedOperation = signedOperation;
    report.signedTime = now();

    // broadcast the transaction
    const optimisticOperation = getEnv("DISABLE_TRANSACTION_BROADCAST")
      ? signedOperation.operation
      : await accountBridge.broadcast({
          account,
          signedOperation,
        });
    report.optimisticOperation = optimisticOperation;
    report.broadcastedTime = now();
    log(
      "engine",
      `spec ${spec.name}/${account.name}/${optimisticOperation.hash} broadcasted`
    );

    // wait the condition are good (operation confirmed)
    const startTime = Date.now();

    const step = (account) => {
      const timedOut = Date.now() - startTime > 60 * 1000;

      const operation = account.operations.find(
        (o) => o.id === optimisticOperation.id
      );

      if (timedOut && !operation) {
        throw new Error(
          "could not find optimisticOperation " + optimisticOperation.id
        );
      }

      if (operation && mutation.test) {
        try {
          mutation.test({
            accountBeforeTransaction,
            transaction,
            status,
            optimisticOperation,
            operation,
            account,
          });
        } catch (e) {
          // We never reach the final test success
          if (timedOut) {
            throw e;
          }
          // We will try again
          return;
        }
      }

      return operation;
    };

    const result = await awaitAccountOperation({
      account,
      accountBridge,
      optimisticOperation,
      step,
    });
    report.finalAccount = result.account;
    report.operation = result.operation;
    report.confirmedTime = now();
    log(
      "engine",
      `spec ${spec.name}/${account.name}/${optimisticOperation.hash} confirmed`
    );
  } catch (error) {
    log("mutation-error", spec.name + ": " + String(error));
    report.error = error;
  }
  report.latestSignOperationEvent = latestSignOperationEvent;
  return report;
}

async function syncAccount(initialAccount: Account): Promise<Account> {
  const acc = await getAccountBridge(initialAccount)
    .sync(initialAccount, { paginationConfig: {} })
    .pipe(
      reduce((a, f: (Account) => Account) => f(a), initialAccount),
      timeoutWith(
        5 * 60 * 1000,
        throwError(new Error("account sync timeout for " + initialAccount.name))
      )
    )
    .toPromise();
  return acc;
}

export function autoSignTransaction<T: Transaction>({
  transport,
  deviceAction,
  appCandidate,
  account,
  transaction,
  status,
}: {
  transport: *,
  deviceAction: DeviceAction<T, *>,
  appCandidate: AppCandidate,
  account: Account,
  transaction: T,
  status: TransactionStatus,
}) {
  let sub;
  let observer;
  let state;
  const recentEvents = [];

  return mergeMap<SignOperationEvent, SignOperationEvent, SignOperationEvent>(
    (e) => {
      if (e.type === "device-signature-requested") {
        return Observable.create((o) => {
          if (observer) {
            o.error(
              new Error(
                "device-signature-requested should not be called twice!"
              )
            );
            return;
          }
          observer = o;
          o.next(e);

          const timeout = setTimeout(() => {
            o.error(
              new Error(
                "device action timeout. Recent events was:\n" +
                  recentEvents.map((e) => JSON.stringify(e)).join("\n")
              )
            );
          }, 20 * 1000);

          sub = transport.automationEvents.subscribe({
            next: (event) => {
              recentEvents.push(event);
              if (recentEvents.length > 5) {
                recentEvents.shift();
              }
              try {
                state = deviceAction({
                  appCandidate,
                  account,
                  transaction,
                  event,
                  transport,
                  state,
                  status,
                });
              } catch (e) {
                o.error(e);
              }
            },
            complete: () => {
              o.complete();
            },
            error: (e) => {
              o.error(e);
            },
          });

          return () => {
            clearTimeout(timeout);
            sub.unsubscribe();
          };
        });
      } else if (observer) {
        observer.complete();
        observer = null;
      }

      if (sub) {
        sub.unsubscribe();
      }

      return of(e);
    }
  );
}

export function getImplicitDeviceAction(currency: CryptoCurrency) {
  const actions = deviceActions[currency.family];
  const accept = actions && actions.acceptTransaction;
  invariant(
    accept,
    "a acceptTransaction is missing for family %s",
    currency.family
  );
  return accept;
}

function awaitAccountOperation({
  account,
  step,
}: {
  account: Account,
  step: (Account) => ?Operation,
}): Promise<{ account: Account, operation: Operation }> {
  log("engine", "awaitAccountOperation on " + account.name);
  let syncCounter = 0;
  let acc = account;

  async function loop() {
    const operation = step(acc);

    if (operation) {
      log("engine", "found " + operation.id);
      return { account: acc, operation };
    }

    await delay(5000);
    log("engine", "sync #" + syncCounter++ + " on " + account.name);
    acc = await syncAccount(acc);

    const r = await loop();
    return r;
  }

  return loop();
}
