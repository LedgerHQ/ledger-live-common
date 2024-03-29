import { bip32asBuffer } from "@ledgerhq/hw-app-btc/lib/bip32";

const getSerializedAddressParameters = (
  path: string
): {
  addressParameters: Buffer;
} => {
  const addressParameters = bip32asBuffer(path);
  return {
    addressParameters,
  };
};

export default {
  getSerializedAddressParameters,
};
