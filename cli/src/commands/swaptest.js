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

const test = async deviceId => {
  const fromAccount = await getAccountBridge(accountToSendSwap, null)
    .sync(accountToSendSwap, { paginationConfig: {} })
    .pipe(reduce((a, f) => f(a), accountToSendSwap))
    .toPromise();

  const exchange: Exchange = {
    fromAccount,
    fromParentAccount: undefined,
    toAccount: accountToReceiveSwap,
    toParentAccount: undefined,
    fromAmount: "0.005",
    sendMax: false
  };

  const exchangeRates = await getExchangeRates(exchange);
  // NB using the first rate
  const { transaction, swapId } = await initSwap(
    exchange,
    exchangeRates[0],
    deviceId
  );
  console.log("got the tx, attempt to sign", { transaction, swapId });
  const bridge = getAccountBridge(exchange.fromAccount);
  const signOperation = await bridge
    .signOperation({ account: exchange.fromAccount, deviceId, transaction })
    .pipe(
      tap(e => console.log(e)),
      first(e => e.type === "signed"),
      map(e => e.signedOperation)
    )
    .toPromise();

  console.log({ transaction, swapId, signOperation });
};

export default {
  args: [deviceOpt],
  job: ({ device }: $Shape<{ device: string }>) => from(test(device))
};
