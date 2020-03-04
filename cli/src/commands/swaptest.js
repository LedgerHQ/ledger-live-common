// @flow
/* eslint-disable no-console */
import { from } from "rxjs";
import initSwap from "@ledgerhq/live-common/lib/hw/swap/initSwap";
import { withDevice } from "@ledgerhq/live-common/lib/hw/deviceAccess";
import type { Exchange } from "@ledgerhq/live-common/lib/swap/types";
import { getExchangeRates } from "@ledgerhq/live-common/lib/swap";
import { deviceOpt } from "../scan";
import { accountToReceiveSwap, accountToSendSwap } from "../poc/accounts";

const test = async transport => {
  const exchange: Exchange = {
    fromAccount: accountToSendSwap,
    fromParentAccount: undefined,
    toAccount: accountToReceiveSwap,
    toParentAccount: undefined,
    fromAmount: 0.04,
    sendMax: false
  };

  const exchangeRates = await getExchangeRates(exchange);
  // NB using the first rate
  const { transaction, swapId } = await initSwap(
    exchange,
    exchangeRates[0],
    transport
  );
  console.log({ transaction, swapId });
};

export default {
  args: [deviceOpt],
  job: ({ device }: $Shape<{ device: string }>) =>
    withDevice(device || "")(transport => from(test(transport)))
};
