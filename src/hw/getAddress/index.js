// @flow
import invariant from "invariant";
import {
  DeviceAppVerifyNotSupported,
  UserRefusedAddress
} from "@ledgerhq/errors";
import type { Resolver } from "./types";
import perFamily from "../../generated/hw-getAddress";

const dispatch: Resolver = (transport, opts) => {
  const { currency, verify } = opts;
  const getAddress = perFamily[currency.family];
  invariant(getAddress, `getAddress is not implemented for ${currency.id}`);
  return getAddress(transport, opts).catch(e => {
    if (e && e.name === "TransportStatusError") {
      if (e.statusCode === 0x6b00 && verify) {
        throw new DeviceAppVerifyNotSupported();
      }
      if (e.statusCode === 0x6985) {
        throw new UserRefusedAddress();
      }
    }
    throw e;
  });
};

export default dispatch;
