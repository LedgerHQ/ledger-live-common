// from https://github.com/LedgerHQ/xpub-scan/blob/master/src/actions/deriveAddresses.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as bjs from "bitcoinjs-lib";
import { publicKeyTweakAdd } from "secp256k1";
import { DerivationModes } from "../types";
import Base from "./base";

class Bitcoin extends Base {
  toOutputScript(address: string): Buffer {
    return bjs.address.toOutputScript(address, this.network);
  }

  // eslint-disable-next-line class-methods-use-this
  validateAddress(address: string): boolean {
    try {
      // This prefix check is to avoid returning false in cases where a valid base58 address also happens
      // to be a valid bech32(m) string (but invalid segwit address).
      if (address.toLowerCase().startsWith(`${this.network.bech32}1`)) {
        return this.tryBech32(address);
      }
    } catch {
      /* Try base58 instead */
    }
    try {
      return this.tryBase58(address);
    } catch {
      return false;
    }
  }

  // get address given an address type
  getAddress(
    derivationMode: string,
    xpub: string,
    account: number,
    index: number
  ): string {
    if (Base.addressCache[`${derivationMode}-${xpub}-${account}-${index}`]) {
      return Base.addressCache[`${derivationMode}-${xpub}-${account}-${index}`];
    }
    switch (derivationMode) {
      case DerivationModes.TAPROOT:
        Base.addressCache[`${derivationMode}-${xpub}-${account}-${index}`] =
          this.getTaprootAddress(xpub, account, index);
        return Base.addressCache[
          `${derivationMode}-${xpub}-${account}-${index}`
        ];
      default:
        return super.getAddress(derivationMode, xpub, account, index);
    }
  }

  private tryBech32(address: string): boolean {
    const result = bjs.address.fromBech32(address);
    if (this.network.bech32 !== result.prefix) {
      // Address doesn't use the expected human-readable part ${network.bech32}
      return false;
    }
    if (result.version > 16 || result.version < 0) {
      // Address has invalid version
      return false;
    }
    if (result.data.length < 2 || result.data.length > 40) {
      // Address has invalid data length
      return false;
    }
    if (
      result.version === 0 &&
      result.data.length !== 20 &&
      result.data.length !== 32
    ) {
      // Version 0 address uses an invalid witness program length
      return false;
    }
    return true;
  }

  private tryBase58(address: string): boolean {
    const result = bjs.address.fromBase58Check(address);
    if (
      this.network.pubKeyHash === result.version ||
      this.network.scriptHash === result.version
    ) {
      return true;
    }
    return false;
  }

  private getTaprootAddress(
    xpub: string,
    account: number,
    index: number
  ): string {
    const ecdsaPubkey = this.getPubkeyAt(xpub, account, index);
    // A BIP32 derived key can be converted to a schnorr pubkey by dropping
    // the first byte, which represent the oddness/evenness. In schnorr all
    // pubkeys are even.
    // https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki#public-key-conversion
    const schnorrInternalPubkey = ecdsaPubkey.slice(1);

    const evenEcdsaPubkey = Buffer.concat([
      Buffer.from([0x02]),
      schnorrInternalPubkey,
    ]);
    const tweak = bjs.crypto.taggedHash("TapTweak", schnorrInternalPubkey);

    // Q = P + int(hash_TapTweak(bytes(P)))G
    const outputEcdsaKey = Buffer.from(
      publicKeyTweakAdd(evenEcdsaPubkey, tweak)
    );
    // Convert to schnorr.
    const outputSchnorrKey = outputEcdsaKey.slice(1);
    // Create address
    return bjs.address.toBech32(outputSchnorrKey, 1, this.network.bech32);
  }

  isTaprootAddress(address: string): boolean {
    // This prefix check is to avoid returning false in cases where a valid base58 address also happens
    // to be a valid bech32(m) string (but invalid segwit address).
    if (address.toLowerCase().startsWith(`${this.network.bech32}1`)) {
      try {
        bjs.address.fromBech32(address);
      } catch {
        return true;
      }
    }
    return false;
  }
}

export default Bitcoin;
