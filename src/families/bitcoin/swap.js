// @flow

import { bip32asBuffer } from "@ledgerhq/hw-app-btc/lib/bip32";
import type { AddressFormat } from "@ledgerhq/hw-app-btc/lib/getWalletPublicKey";

const addressFormatMap = {
  legacy: 0,
  p2sh: 1,
  bech32: 2
};

/**
 * Swap app is expecting we pass the output of this as a concat buffer.
 * To check if it will be different per family or not once more families
 * are supported.
 * https://github.com/teams2ua/ledgerjs/blob/hw-swap-app/packages/hw-app-swap/src/Swap.js#L85-L104
 */
const getSerializedAddressParameters = (
  path: string,
  format: AddressFormat = "legacy"
): { addressParameters: Buffer } => {
  if (!(format in addressFormatMap)) {
    throw new Error("btc.getWalletPublicKey invalid format=" + format);
  }
  console.log("bip32asBuffer on", { path, format });
  const buffer = bip32asBuffer(path);
  const addressParameters = Buffer.concat([
    Buffer.from([addressFormatMap[format]]),
    buffer
  ]);
  console.log(addressParameters.toString("hex"));
  return { addressParameters };
};

export default { getSerializedAddressParameters };
