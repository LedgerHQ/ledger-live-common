// @flow
import Trx from "../../families/neo/hw-app-neo";
import type Transport from "@ledgerhq/hw-transport";
import type { CryptoCurrency } from "../../types";

export default async (
  currency: CryptoCurrency,
  transport: Transport<*>,
  path: string,
  rawTransaction: string
) => {
  const trx = new Trx(transport);
  const signature = await trx.signTransaction(path, rawTransaction);
  return Buffer.from(signature).toString("hex");
};
