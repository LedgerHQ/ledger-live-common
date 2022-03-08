let secp256k1;
try {
  secp256k1 = require("./secp256k1-js");
} catch (err) {
  secp256k1 = require("./secp256k1-rn");
}
export async function publicKeyTweakAdd(
  publicKey: Uint8Array,
  tweak: Uint8Array
): Promise<Buffer> {
  return await secp256k1.publicKeyTweakAdd(publicKey, tweak);
}
