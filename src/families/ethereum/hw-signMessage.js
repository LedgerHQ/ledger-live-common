// @flow

import Eth from "@ledgerhq/hw-app-eth";
import type Transport from "@ledgerhq/hw-transport";
import { TypedDataUtils } from "eth-sig-util";
import { bufferToHex } from "ethereumjs-util";
import type { MessageData, Result } from "../../hw/signMessage/types";
import type { CryptoCurrency } from "../../types";
import type { DerivationMode } from "../../derivation";

type TypedMessageData = {
  currency: CryptoCurrency,
  path: string,
  verify?: boolean,
  derivationMode: DerivationMode,
  message: {
    types: {
      EIP712Domain: [{ type: string, name: string }],
      [key: string]: [{ type: string, name: string }],
    },
    primaryType: string,
    domain: any,
    message: any,
  },
};

type EthResolver = (
  Transport<*>,
  MessageData | TypedMessageData
) => Promise<Result>;

const resolver: EthResolver = async (transport, { path, message }) => {
  const eth = new Eth(transport);

  let result;

  if (typeof message === "string") {
    const hexMessage = Buffer.from(message).toString("hex");
    result = await eth.signPersonalMessage(path, hexMessage);
  } else {
    const domainHash = TypedDataUtils.hashStruct(
      "EIP712Domain",
      message.domain,
      message.types,
      true
    );
    const messageHash = TypedDataUtils.hashStruct(
      message.primaryType,
      message.message,
      message.types,
      true
    );

    result = await eth.signEIP712HashedMessage(
      path,
      bufferToHex(domainHash),
      bufferToHex(messageHash)
    );
  }

  var v = result["v"] - 27;
  v = v.toString(16);
  if (v.length < 2) {
    v = "0" + v;
  }
  const signature = `0x${result["r"]}${result["s"]}${v}`;

  return { rsv: result, signature };
};

export default resolver;
