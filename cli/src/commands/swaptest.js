// @flow
/* eslint-disable no-console */
import { from } from "rxjs";
import { first, map, reduce, tap, filter } from "rxjs/operators";
import type { Exchange } from "@ledgerhq/live-common/lib/swap/types";
import { initSwap } from "@ledgerhq/live-common/lib/swap";
import { getExchangeRates } from "@ledgerhq/live-common/lib/swap";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import { toTransactionRaw } from "@ledgerhq/live-common/lib/transaction";
import { deviceOpt } from "../scan";
import { account11, account12 } from "../poc/accounts";
import invariant from "invariant";

const exec = async ({
  deviceId = "",
  mock = false,
  amount = 500000,
  reverse = false,
  sendMax = false,
}) => {
  console.log(`/!\\ Performing a ${mock ? "MOCK" : "REAL"} swap test`);
  console.log(`\tSwaping ${reverse ? "LTC-BTC" : "BTC-LTC"}`);
  invariant(sendMax || amount, "We either need an amount, or sendMax");

  const accountToSendSwap = reverse ? account12(mock) : account11(mock);
  const accountToReceiveSwap = reverse ? account11(mock) : account12(mock);

  const fromAccount = await getAccountBridge(accountToSendSwap, null)
    .sync(accountToSendSwap, { paginationConfig: {} })
    .pipe(reduce((a, f) => f(a), accountToSendSwap))
    .toPromise();

  const bridge = getAccountBridge(fromAccount);
  let transaction = bridge.createTransaction(fromAccount);

  if (!sendMax) {
    console.log(`\t${amount} satoshsis worth.\n`);
    transaction = bridge.updateTransaction(transaction, { amount });
  } else {
    console.log(`\tWe are attempting a sendmax, calculate max spendable.\n`);
    const amount = await bridge.estimateMaxSpendable({
      account: fromAccount,
      transaction,
    });
    transaction = bridge.updateTransaction(transaction, { amount });
  }

  console.log(`\tTransaction:\n`);
  console.log(toTransactionRaw(transaction));

  const exchange: Exchange = {
    fromAccount,
    fromParentAccount: undefined,
    toAccount: accountToReceiveSwap,
    toParentAccount: undefined,
    transaction,
  };

  console.log("Getting exchange rates");
  const exchangeRates = await getExchangeRates(exchange);

  console.log("Initialising swap");
  // NB using the first rate
  const initSwapResult = await initSwap(exchange, exchangeRates[0], deviceId)
    .pipe(
      tap((e) => console.log(e)),
      filter((e) => e.type === "init-swap-result"),
      map((e) => e.initSwapResult)
    )
    .toPromise();

  const swapId = initSwapResult.swapId;
  transaction = initSwapResult.transaction;

  console.log("got the tx, attempt to sign", {
    transaction: toTransactionRaw(transaction),
    swapId,
  });
  const signedOperation = await bridge
    .signOperation({ account: fromAccount, deviceId, transaction })
    .pipe(
      tap((e) => console.log(e)),
      first((e) => e.type === "signed"),
      map((e) => e.signedOperation)
    )
    .toPromise();

  console.log("tx signed successfully", { signedOperation });
  console.log("broadcasting");

  const operation = await bridge.broadcast({
    account: fromAccount,
    signedOperation,
  });

  console.log("resulting operation", { operation });
};

export default {
  args: [
    deviceOpt,
    {
      name: "mock",
      alias: "m",
      type: Boolean,
    },
    {
      name: "amount",
      alias: "a",
      type: Number,
    },
    {
      name: "reverse",
      alias: "r",
      type: Boolean,
    },
    {
      name: "sendMax",
      alias: "s",
      type: Boolean,
    },
  ],
  job: ({
    device,
    mock,
    amount,
    reverse,
    sendMax,
  }: $Shape<{
    device: string,
    mock: boolean,
    amount: number,
    reverse: boolean,
    sendMax: boolean,
  }>) => from(exec({ device, mock, amount, reverse, sendMax })),
};
