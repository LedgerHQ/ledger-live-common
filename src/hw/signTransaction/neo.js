// @flow
import Trx from "../../families/neo/hw-app-neo";
import type Transport from "@ledgerhq/hw-transport";
import type { CryptoCurrency } from "../../types";

const retrieveSignature = (rawSignature: Buffer) => {
  // DER prefix + total length
  let offset = 2;

  // R field: marker
  offset += 1;
  //TODO: would use VarInts but r is always 32 bytes so ...
  const rLength = rawSignature.readUIntBE(offset, 1);
  // R length
  offset += 1;
  // Get R field
  const r = rawSignature
  .slice(offset, offset + rLength)
  .toString('hex')
  .padStart(64, '0');

  // S field: marker
  offset += rLength + 1;
  //TODO: would use VarInts but s is always 32 bytes so ...
  const sLength = rawSignature.readUIntBE(offset, 1);
  // S length
  offset += 1;
  // Get S field
  const s = rawSignature
  .slice(offset, offset + sLength)
  .toString('hex')
  .padStart(64, '0');

  return r.concat('', s);
};

export default async (
  currency: CryptoCurrency,
  transport: Transport<*>,
  path: string,
  rawTransaction: string
) => {
  const trx = new Trx(transport);
  const signature = await trx.signTransaction(path, rawTransaction);
  //Signature we get is DER so let's format it
  return retrieveSignature(signature);
};
