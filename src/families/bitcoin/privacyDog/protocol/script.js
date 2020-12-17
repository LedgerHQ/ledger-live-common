// @flow

import * as baddress from "bitcoinjs-lib/src/address";
import * as bscript from "bitcoinjs-lib/src/script";

export type ScriptType = "P2WPKH" | "P2SH" | "P2PKH" | "P2MS" | "UNKNOWN";

export function getScriptFromAddress(address: string): string {
  const script = baddress.toOutputScript(address);
  return bscript.toASM(script);
}

export function isP2WPKH(script: string): boolean {
  const regex = /^OP_0 [a-z0-9]{40}$/;
  return script.match(regex) !== null;
}

export function isP2SH(script: string): boolean {
  const regex = /^OP_HASH160 [a-z0-9]{40} OP_EQUAL$/;
  return script.match(regex) !== null;
}

export function isP2PKH(script: string): boolean {
  const regex = /^OP_DUP OP_HASH160 [a-z0-9]{40} OP_EQUALVERIFY OP_CHECKSIG$/;
  return script.match(regex) !== null;
}

export function isP2MS(script: string): boolean {
  const regex = /OP_CHECKMULTISIG$/;
  return script.match(regex) !== null;
}

export function getScriptType(address: string): ScriptType {
  const script = getScriptFromAddress(address);
  if (isP2WPKH(script)) {
    return "P2WPKH";
  }

  if (isP2SH(script)) {
    return "P2SH";
  }

  if (isP2PKH(script)) {
    return "P2PKH";
  }

  if (isP2MS(script)) {
    return "P2MS";
  }

  return "UNKNOWN";
}
