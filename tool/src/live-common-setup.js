// @flow
/* eslint-disable no-console */
import axios from "axios";
import WebSocket from "ws";
import { setEnvUnsafe } from "@ledgerhq/live-common/lib/env";
import {
  setNetwork,
  setWebSocketImplementation
} from "@ledgerhq/live-common/lib/network";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { registerTransportModule } from "@ledgerhq/live-common/lib/hw";
import { retry } from "@ledgerhq/live-common/lib/promise";
import { logsObservable } from "@ledgerhq/live-common/lib/logs";
import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";
import "@ledgerhq/live-common/lib/load/tokens/ethereum/erc20";

for (const k in process.env) setEnvUnsafe(k, process.env[k]);

const logger = process.env.VERBOSE
  ? (level, ...args) => console.log(level, ...args)
  : undefined;

if (logger) {
  logsObservable.subscribe(log =>
    logger("live-common:" + log.type, log.message)
  );
}

setNetwork(axios);

setWebSocketImplementation(WebSocket);

implementLibcore({
  lib: require("@ledgerhq/ledger-core"),
  dbPath: "./dbdata",
  logger
});

registerTransportModule({
  id: "hid",
  open: devicePath =>
    // $FlowFixMe
    retry(() => TransportNodeHid.open(devicePath), {
      maxRetry: 2
    }),
  disconnect: () => Promise.resolve()
});
