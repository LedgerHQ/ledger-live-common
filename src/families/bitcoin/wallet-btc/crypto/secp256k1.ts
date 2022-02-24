let secp256k1;
try {
  secp256k1 = require("secp256k1/bindings");
} catch (err) {
  secp256k1 = require("./noble-secp256k1");
}
export function publicKeyTweakAdd(
  publicKey: Uint8Array,
  tweak: Uint8Array
): Uint8Array {
  return secp256k1.publicKeyTweakAdd(publicKey, tweak);
}
