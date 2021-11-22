import * as bjs from "bitcoinjs-lib";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { toOutputScript } from "bitcoinjs-lib/src/address";
import { DerivationModes } from "../types";
import { ICrypto } from "./types";
import * as ecc from "tiny-secp256k1";
import BIP32Factory from "bip32";
import Base from "./base";

const bip32 = BIP32Factory(ecc);

// Todo copy paste from bitcoin.ts. we can merge them later
class Litecoin extends Base implements ICrypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  network: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor({ network }: { network: any }) {
    super({ network });
    this.network.dustThreshold = 10000;
    this.network.dustPolicy = "FIXED";
    this.network.usesTimestampedTransaction = false;
  }

  getLegacyAddress(xpub: string, account: number, index: number): string {
    const { address } = bjs.payments.p2pkh({
      pubkey: bip32.fromBase58(xpub, this.network).derive(account).derive(index)
        .publicKey,
      network: this.network,
    });
    return String(address);
  }

  getSegWitAddress(xpub: string, account: number, index: number): string {
    const { address } = bjs.payments.p2sh({
      redeem: bjs.payments.p2wpkh({
        pubkey: bip32
          .fromBase58(xpub, this.network)
          .derive(account)
          .derive(index).publicKey,
        network: this.network,
      }),
    });
    return String(address);
  }

  getNativeSegWitAddress(xpub: string, account: number, index: number): string {
    const { address } = bjs.payments.p2wpkh({
      pubkey: bip32.fromBase58(xpub, this.network).derive(account).derive(index)
        .publicKey,
      network: this.network,
    });

    return String(address);
  }

  getAddress(
    derivationMode: DerivationModes,
    xpub: string,
    account: number,
    index: number
  ): string {
    switch (derivationMode) {
      case DerivationModes.LEGACY:
        return this.getLegacyAddress(xpub, account, index);
      case DerivationModes.SEGWIT:
        return this.getSegWitAddress(xpub, account, index);
      case DerivationModes.NATIVE_SEGWIT:
        return this.getNativeSegWitAddress(xpub, account, index);
      default:
        throw new Error("Should not be reachable");
    }
  }

  // infer address type from its syntax
  getDerivationMode(address: string) {
    if (address.match("^(ltc1).*")) {
      return DerivationModes.NATIVE_SEGWIT;
    }
    if (address.match("^(3|2|M).*")) {
      return DerivationModes.SEGWIT;
    }
    if (address.match("^(1|n|m|L).*")) {
      return DerivationModes.LEGACY;
    }
    throw new Error(
      "INVALID ADDRESS: ".concat(address).concat(" is not a valid address")
    );
  }

  toOutputScript(address: string) {
    return toOutputScript(address, this.network);
  }

  // eslint-disable-next-line class-methods-use-this
  validateAddress(address: string): boolean {
    // bech32 address
    if (address.substring(0, 3) === "ltc") {
      try {
        if (bjs.address.fromBech32(address)) {
          return true;
        }
      } catch {
        /* try base58 instead */
      }
    }
    // bs58 address
    return super.validateAddress(address);
  }
}

export default Litecoin;
