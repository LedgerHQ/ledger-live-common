import secp256k1 from "secp256k1/bindings";
export async function publicKeyTweakAdd(
  publicKey: Uint8Array,
  tweak: Uint8Array
): Promise<Buffer> {
  return Promise.resolve(
    Buffer.from(secp256k1.publicKeyTweakAdd(publicKey, tweak))
  );
}
