import { Bip32PublicKey } from "@stricahq/bip32ed25519";
import { BipPath, PaymentChain, StakeChain } from "./types";

export function getBipPathFromString(path: string): BipPath {
  const regEx = new RegExp(/^1852'\/1815'\/(\d*)'\/([012])\/(\d*)/);
  const result = path.match(regEx);
  if (result == null) {
    throw new Error("Invalid derivation path");
  }
  return getBipPath({
    account: parseInt(result[1]),
    chain: parseInt(result[2]),
    index: parseInt(result[3]),
  });
}

export function getBipPath({
  account,
  chain,
  index,
}: {
  account: number;
  chain: PaymentChain | StakeChain;
  index: number;
}): BipPath {
  return {
    purpose: 1852,
    coin: 1815,
    account,
    chain,
    index,
  };
}

export function getBipPathString({
  account,
  chain,
  index,
}: {
  account: number;
  chain: number;
  index: number;
}): string {
  return `1852'/1815'/${account}'/${chain}/${index}`;
}

export function getExtendedPublicKeyFromHex(keyHex: string): Bip32PublicKey {
  return Bip32PublicKey.fromBytes(Buffer.from(keyHex, "hex"));
}

export function getCredentialKey(
  accountKey: Bip32PublicKey,
  path: BipPath
): { key: string; path: BipPath } {
  const keyBytes = accountKey
    .derive(path.chain)
    .derive(path.index)
    .toPublicKey()
    .hash();
  const pubKeyHex = keyBytes.toString("hex");
  return {
    key: pubKeyHex,
    path,
  };
}
