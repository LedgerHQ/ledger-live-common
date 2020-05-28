// @flow
/* eslint-disable no-console */
import { from } from "rxjs";
import { first, map, reduce, tap, filter } from "rxjs/operators";
import type { Exchange } from "@ledgerhq/live-common/lib/swap/types";
import { initSwap } from "@ledgerhq/live-common/lib/swap";
import { getExchangeRates } from "@ledgerhq/live-common/lib/swap";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import { deviceOpt } from "../scan";
import { account1, account2 } from "../poc/accounts";
import { BigNumber } from "bignumber.js";

const test = async (
  deviceId,
  mock = false,
  amount = 500000,
  reverse = false
) => {
  console.log(`/!\\ Performing a ${mock ? "MOCK" : "REAL"} swap test`);
  console.log(`\tSwaping ${reverse ? "LTC-BTC" : "BTC-LTC"}`);
  console.log(`\t${amount} satoshsis worth.\n`);

  const accountToSendSwap = reverse ? account2(mock) : account1(mock);
  const accountToReceiveSwap = reverse ? account1(mock) : account2(mock);

  const fromAccount = await getAccountBridge(accountToSendSwap, null)
    .sync(accountToSendSwap, { paginationConfig: {} })
    .pipe(reduce((a, f) => f(a), accountToSendSwap))
    .toPromise();

  const exchange: Exchange = {
    fromAccount,
    fromParentAccount: undefined,
    toAccount: accountToReceiveSwap,
    toParentAccount: undefined,
    fromAmount: BigNumber(amount),
    sendMax: false
  };

  console.log("Getting exchange rates");
  const exchangeRates = await getExchangeRates(exchange);

  console.log("Initialising swap");
  // NB using the first rate
  const { transaction, swapId } = await initSwap(exchange, exchangeRates[0], deviceId)
    .pipe(
      tap(e => console.log(e)),
      filter(e => e.type === "init-swap-result"),
      map(e => e.initSwapResult)
    )
    .toPromise();

  console.log("got the tx, attempt to sign", { transaction, swapId });
  const bridge = getAccountBridge(exchange.fromAccount);
  const signedOperation = await bridge
    .signOperation({ account: exchange.fromAccount, deviceId, transaction })
    .pipe(
      tap(e => console.log(e)),
      first(e => e.type === "signed"),
      map(e => e.signedOperation)
    )
    .toPromise();

  console.log("tx signed successfully", { signedOperation });
  console.log("broadcasting");

  const operation = await bridge.broadcast({
    account: exchange.fromAccount,
    signedOperation
  });

  console.log("resulting operation", { operation });
};

export default {
  args: [
    deviceOpt,
    {
      name: "mock",
      alias: "m",
      type: Boolean
    },
    {
      name: "amount",
      alias: "a",
      type: Number
    },
    {
      name: "reverse",
      alias: "r",
      type: Boolean
    }
  ],
  job: ({
    device,
    mock,
    amount,
    reverse
  }: $Shape<{
    device: string,
    mock: boolean,
    amount: number,
    reverse: boolean
  }>) => from(test(device, mock, amount, reverse))
};
