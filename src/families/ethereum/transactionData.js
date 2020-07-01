// @flow

import type { EthereumOperationMode, Transaction } from "./types";
import type { Account, SubAccount } from "../../types";

import abiCoder from "web3-eth-abi";
import { NotEnoughBalance } from "@ledgerhq/errors";

import contractAbis from "./contractAbis";

type EthereumOperationModeDataSerializer = (
  a: Account,
  s: SubAccount,
  t: Transaction
) => Buffer;

type OperationModeHandlers = {
  [mode: EthereumOperationMode]: EthereumOperationModeDataSerializer,
};

function generateMethodSignature(functionAbi: AbiMember) {
  const paramList = functionAbi.inputs.map((input) => input.type);

  return `${functionAbi.name}(${paramList.join(",")})`;
}

function encodeParameters(functionAbi: AbiMember, params: any) {
  const encodedParameters = functionAbi.inputs.map((input) => {
    const value = params[input.name];

    if (value === undefined) {
      throw new Error(
        `missing parameter "${input.name}" of type "${input.type}"`
      );
    }
    const encodedParameter = abiCoder.encodeParameter(input.type, value);
    return Buffer.from(encodedParameter.slice(2), "hex");
  });

  return Buffer.concat(encodedParameters);
}

function serializeTx(contractAbi: any, functionName: string, params: any) {
  const functionAbi = contractAbi.find(
    (member) => member.type === "function" && member.name === functionName
  );

  if (!functionAbi) {
    throw new Error(
      `no such function ${functionName} in the provided contract ABI`
    );
  }

  const functionSignature = generateMethodSignature(functionAbi);
  const encodedFunctionSignature = Buffer.from(
    abiCoder.encodeFunctionSignature(functionSignature).slice(2),
    "hex"
  );
  const encodedFunctionParameters = encodeParameters(functionAbi, params);

  return Buffer.concat([encodedFunctionSignature, encodedFunctionParameters]);
}

const erc20Transfer: EthereumOperationModeDataSerializer = (a, s, t) => {
  let amount;

  // determining the token amount to transfer
  if (t.useAllAmount) {
    amount = s.balance;
  } else {
    if (t.amount.gt(s.balance)) {
      throw new NotEnoughBalance();
    }
    amount = t.amount;
  }

  return serializeTx(contractAbis.erc20, "transfer", {
    _to: t.recipient, // destination
    _value: amount, // amount to transfer
  });
};

const erc20Approve: EthereumOperationModeDataSerializer = (a, s, t) =>
  serializeTx(contractAbis.erc20, "approve", {
    _spender: t.recipient, // spender
    _value: t.amount, // amount to approve
  });

const cErc20Mint: EthereumOperationModeDataSerializer = (a, s, t) => {
  let amount;

  if (t.useAllAmount) {
    amount = s.balance;
  } else {
    if (t.amount.gt(s.balance)) {
      throw new NotEnoughBalance();
    }
    amount = t.amount;
  }

  return serializeTx(contractAbis.cErc20, "mint", {
    mintAmount: amount, // amount to supply
  });
};

const cErc20Redeem: EthereumOperationModeDataSerializer = (a, s, t) => {
  // TODO: add guards to make sure the user has enough cTokens
  return serializeTx(contractAbis.cErc20, "redeem", {
    redeemTokens: t.amount, // amount of cTokens to redeem
  });
};

const cErc20RedeemUnderlying: EthereumOperationModeDataSerializer = (
  a,
  s,
  t
) => {
  // TODO: add guards to make sure the user has enough cTokens
  return serializeTx(contractAbis.cErc20, "redeemUnderlying", {
    redeemAmount: t.amount, // amount to redeem
  });
};

const operationModeSerializers: OperationModeHandlers = {
  "erc20.transfer": erc20Transfer,
  "erc20.approve": erc20Approve,
  "cErc20.mint": cErc20Mint,
  "cErc20.redeem": cErc20Redeem,
  "cErc20.redeemUnderlying": cErc20RedeemUnderlying,
};

export function getDataSerializerForMode(
  mode: EthereumOperationMode
): EthereumOperationModeDataSerializer {
  const serializer: EthereumOperationModeDataSerializer =
    operationModeSerializers[mode];

  if (!serializer) {
    throw new Error(
      `No data serializer for ethereum transaction mode "${mode}"`
    );
  }

  return serializer;
}
