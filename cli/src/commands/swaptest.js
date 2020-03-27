// @flow
/* eslint-disable no-console */
import { from } from "rxjs";
import { first, map, reduce, tap } from "rxjs/operators";
import type { Exchange } from "@ledgerhq/live-common/lib/swap/types";
import { initSwap } from "@ledgerhq/live-common/lib/swap";
import { getExchangeRates } from "@ledgerhq/live-common/lib/swap";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import { deviceOpt } from "../scan";
import { accountToReceiveSwap, accountToSendSwap } from "../poc/accounts";
import { BigNumber } from "bignumber.js";

const test = async (deviceId, mock = false) => {
  const fromAccount = await getAccountBridge(accountToSendSwap(mock), null)
    .sync(accountToSendSwap(mock), { paginationConfig: {} })
    .pipe(reduce((a, f) => f(a), accountToSendSwap(mock)))
    .toPromise();

  console.log(`/!\\ Performing a ${mock ? "MOCK" : "REAL"} swap test`);
  const exchange: Exchange = {
    fromAccount,
    fromParentAccount: undefined,
    toAccount: accountToReceiveSwap(mock),
    toParentAccount: undefined,
    fromAmount: BigNumber("500000"),
    sendMax: false
  };

  console.log("Getting exchange rates");
  const exchangeRates = await getExchangeRates(exchange);

  console.log("Initialising swap");
  // NB using the first rate
  const { transaction, swapId } = await initSwap(
    exchange,
    exchangeRates[0],
    deviceId
  );

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
    }
  ],
  job: ({ device, mock }: $Shape<{ device: string, mock: boolean }>) =>
    from(test(device, mock))
};
