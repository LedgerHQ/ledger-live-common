// @flow
import type Transport from "@ledgerhq/hw-transport";
import Sell from "./hw-app-sell/Sell";

export default async (transport: Transport<*>): Promise<string> => {
  const sell = new Sell(transport);
  return sell.startNewTransaction();
};
