// from https://github.com/LedgerHQ/xpub-scan/blob/master/src/actions/deriveAddresses.ts

import * as bjs from "bitcoinjs-lib";
import * as bip32 from "bip32";
import * as bch from "bitcoincashjs"; // TODO deprecated, to replace
import bchaddr from "bchaddrjs";
import { IDerivation, DerivationMode } from "./types";

// a mock explorer class that just use js objects
class Bitcoin implements IDerivation {
  network: any;
  DerivationMode: DerivationMode = {
    LEGACY: "Legacy",
    NATIVE: "Native SegWit",
    SEGWIT: "SegWit",
    BCH: "Bitcoin Cash",
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

  // Based on https://github.com/go-faast/bitcoin-cash-payments/blob/54397eb97c7a9bf08b32e10bef23d5f27aa5ab01/index.js#L63-L73
  getLegacyBitcoinCashAddress(
    xpub: string,
    account: number,
    index: number,
  ): string {
    const CASH_ADDR_FORMAT = bch.Address.CashAddrFormat;

    const node = new bch.HDPublicKey(xpub);
    const child = node.derive(account).derive(index);
    const address = new bch.Address(child.publicKey, bch.Networks.livenet);
    const addrstr = address.toString(CASH_ADDR_FORMAT).split(":");
    if (addrstr.length === 2) {
      return bchaddr.toLegacyAddress(addrstr[1]);
    } else {
      throw new Error("Unable to derive cash address for " + address);
    }
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
      case this.DerivationMode.BCH:
        return this.getLegacyBitcoinCashAddress(xpub, account, index);
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
}

export default Bitcoin;
