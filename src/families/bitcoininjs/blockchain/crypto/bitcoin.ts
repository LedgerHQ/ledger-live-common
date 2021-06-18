// from https://github.com/LedgerHQ/xpub-scan/blob/master/src/actions/deriveAddresses.ts

import * as bjs from "bitcoinjs-lib";
import * as bip32 from "bip32";
import { ICrypto, DerivationMode } from "./types";

// a mock explorer class that just use js objects
class Bitcoin implements ICrypto {
  network: any;
  DerivationMode: DerivationMode = {
    LEGACY: "Legacy",
    NATIVE: "Native SegWit",
    SEGWIT: "SegWit",
  };

  constructor({ network }) {
    this.network = network;
  }

  // derive legacy address at account and index positions
  getLegacyAddress(xpub: string, account: number, index: number): string {
    const { address } = bjs.payments.p2pkh({
      pubkey: bip32.fromBase58(xpub, this.network).derive(account).derive(index)
        .publicKey,
      network: this.network,
    });

    return String(address);
  }

  // derive native SegWit at account and index positions
  getNativeSegWitAddress(xpub: string, account: number, index: number): string {
    const { address } = bjs.payments.p2wpkh({
      pubkey: bip32.fromBase58(xpub, this.network).derive(account).derive(index)
        .publicKey,
      network: this.network,
    });

    return String(address);
  }

  // derive SegWit at account and index positions
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

  // get address given an address type
  getAddress(
    derivationMode: string,
    xpub: string,
    account: number,
    index: number,
  ): string {
    switch (derivationMode) {
      case this.DerivationMode.LEGACY:
        return this.getLegacyAddress(xpub, account, index);
      case this.DerivationMode.SEGWIT:
        return this.getSegWitAddress(xpub, account, index);
      case this.DerivationMode.NATIVE:
        return this.getNativeSegWitAddress(xpub, account, index);
    }

    throw new Error("Should not be reachable");
  }

  // infer address type from its syntax
  //
  // TODO: improve the prefix matching: make the expected prefix
  // correspond to the actual type (currently, a `ltc1` prefix
  // could match a native Bitcoin address type for instance)
  getDerivationMode(address: string) {
    if (address.match("^(bc1|tb1|ltc1).*")) {
      return this.DerivationMode.NATIVE;
    } else if (address.match("^(3|2|M).*")) {
      return this.DerivationMode.SEGWIT;
    } else if (address.match("^(1|n|m|L).*")) {
      return this.DerivationMode.LEGACY;
    } else {
      throw new Error(
        "INVALID ADDRESS: ".concat(address).concat(" is not a valid address"),
      );
    }
  }

  getPsbt() {
    return new bjs.Psbt({ network: this.network });
  }
}

export default Bitcoin;
