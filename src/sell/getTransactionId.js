// @flow
import type Transport from "@ledgerhq/hw-transport";
import Sell from "./hw-app-sell/Sell";

function base64EncodeUrl(str) {
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default async (transport: Transport<*>): Promise<string> => {
  const sell = new Sell(transport, 0x01);
  const txId = await sell.startNewTransaction();
  return base64EncodeUrl(txId.toString("base64"));
};
