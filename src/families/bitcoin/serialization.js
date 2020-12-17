// @flow

import { BigNumber } from "bignumber.js";
import type {
  BitcoinResourcesRaw,
  BitcoinResources,
  BitcoinInputRaw,
  BitcoinInput,
  BitcoinOutputRaw,
  BitcoinOutput,
} from "./types";

export function toBitcoinInputRaw({
  address,
  value,
  previousTxHash,
  previousOutputIndex,
  coinbase,
  scriptSig,
}: BitcoinInput): BitcoinInputRaw {
  return [
    address,
    value ? value.toString() : undefined,
    previousTxHash,
    previousOutputIndex,
    coinbase,
    scriptSig,
  ];
}

export function fromBitcoinInputRaw([
  address,
  value,
  previousTxHash,
  previousOutputIndex,
  coinbase,
  scriptSig,
]: BitcoinInputRaw): BitcoinInput {
  return {
    address: address || undefined,
    value: value ? BigNumber(value) : undefined,
    previousTxHash: previousTxHash || undefined,
    previousOutputIndex,
    coinbase: coinbase || undefined,
    scriptSig: scriptSig || undefined,
  };
}

export function toBitcoinOutputRaw({
  hash,
  outputIndex,
  blockHeight,
  address,
  path,
  value,
  rbf,
  scriptPubKey,
}: BitcoinOutput): BitcoinOutputRaw {
  return [
    hash,
    outputIndex,
    blockHeight,
    address,
    path,
    value.toString(),
    rbf ? 1 : 0,
    scriptPubKey,
  ];
}

export function fromBitcoinOutputRaw([
  hash,
  outputIndex,
  blockHeight,
  address,
  path,
  value,
  rbf,
  scriptPubKey,
]: BitcoinOutputRaw): BitcoinOutput {
  return {
    hash,
    outputIndex,
    blockHeight: blockHeight || undefined,
    address: address || undefined,
    path: path || undefined,
    value: BigNumber(value),
    rbf: !!rbf,
    scriptPubKey,
  };
}

export function toBitcoinResourcesRaw(
  r: BitcoinResources
): BitcoinResourcesRaw {
  return {
    ...r,
    utxos: r.utxos.map(toBitcoinOutputRaw),
  };
}

export function fromBitcoinResourcesRaw(
  r: BitcoinResourcesRaw
): BitcoinResources {
  return {
    ...r,
    utxos: r.utxos.map(fromBitcoinOutputRaw),
  };
}
