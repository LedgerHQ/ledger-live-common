import secp256k1 from "secp256k1";
let secp256k1Instance = secp256k1;

export function setSecp256k1Instance(secp256k1: any): void {
  secp256k1Instance = secp256k1;
}

export async function publicKeyTweakAdd(
  publicKey: Uint8Array,
  tweak: Uint8Array
): Promise<number[]> {
  return Array.from(secp256k1Instance.publicKeyTweakAdd(publicKey, tweak));
}
