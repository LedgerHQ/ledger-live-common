// @flow

import Eth from "@ledgerhq/hw-app-eth";
import type Transport from "@ledgerhq/hw-transport";
import { keccak256, bufferToHex } from "ethereumjs-util";
import { rawEncode } from "ethereumjs-abi";
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

////////
// credits to https://github.com/nicholasmueller/ledger-signature-test

const dependencies = (types, primaryType, found = []) => {
  if (found.includes(primaryType)) {
    return found;
  }
  if (types[primaryType] === undefined) {
    return found;
  }
  found.push(primaryType);
  for (const field of types[primaryType]) {
    for (const dep of dependencies(types, field.type, found)) {
      if (!found.includes(dep)) {
        found.push(dep);
      }
    }
  }
  return found;
};

const encodeType = (types, primaryType) => {
  // Get dependencies primary first, then alphabetical
  let deps = dependencies(types, primaryType);
  deps = deps.filter((t) => t !== primaryType);
  deps = [primaryType].concat(deps.sort());

  // Format as a string with fields
  let result = "";
  for (const type of deps) {
    result += `${type}(${types[type]
      .map(({ name, type }) => `${type} ${name}`)
      .join(",")})`;
  }
  return new Buffer(result);
};

const typeHash = (types, primaryType) => {
  return keccak256(encodeType(types, primaryType));
};

const encodeData = (types, primaryType, data) => {
  const encTypes = [];
  const encValues = [];

  // Add typehash
  encTypes.push("bytes32");
  encValues.push(typeHash(types, primaryType));

  // Add field contents
  for (const field of types[primaryType]) {
    let value = data[field.name];
    if (field.type === "string" || field.type === "bytes") {
      encTypes.push("bytes32");
      value = keccak256(new Buffer(value));
      encValues.push(value);
    } else if (types[field.type] !== undefined) {
      encTypes.push("bytes32");
      value = keccak256(encodeData(types, field.type, value));
      encValues.push(value);
    } else if (field.type.lastIndexOf("]") === field.type.length - 1) {
      throw new Error("Arrays currently unimplemented in encodeData");
    } else {
      encTypes.push(field.type);
      encValues.push(value);
    }
  }

  return rawEncode(encTypes, encValues);
};

const structHash = (types, primaryType, data) => {
  return keccak256(encodeData(types, primaryType, data));
};
//
////////

const resolver: EthResolver = async (transport, { path, message }) => {
  const eth = new Eth(transport);

  let result;

  if (typeof message === "string") {
    const hexMessage = Buffer.from(message).toString("hex");
    result = await eth.signPersonalMessage(path, hexMessage);
  } else {
    const domainHash = structHash(
      message.types,
      "EIP712Domain",
      message.domain
    );
    const messageHash = structHash(
      message.types,
      message.primaryType,
      message.message
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
