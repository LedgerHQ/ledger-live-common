// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { toOutputScript } from "bitcoinjs-lib/src/address";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import zec from "zcash-bitcore-lib";
import bs58check from "bs58check";
import { DerivationModes } from "../types";
import { ICrypto } from "./types";
import coininfo from "coininfo";

class ZCash implements ICrypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  network: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor({ network }: { network: any }) {
    this.network = network;
    this.network.dustThreshold = 10000;
    this.network.dustPolicy = "FIXED";
    this.network.usesTimestampedTransaction = false;
  }

  // eslint-disable-next-line
  baddrToTaddr(baddrStr: string) {
    const baddr = bs58check.decode(baddrStr).slice(1);
    const taddr = new Uint8Array(22);
    taddr.set(baddr, 2);
    taddr.set([0x1c, 0xb8], 0);
    return bs58check.encode(Buffer.from(taddr));
  }

  private static toBitcoinAddr(taddr: string) {
    // refer to https://runkitcdn.com/gojomo/baddr2taddr/1.0.2
    const baddr = new Uint8Array(21);
    baddr.set(bs58check.decode(taddr).slice(2), 1);
    return bs58check.encode(Buffer.from(baddr));
  }

  // eslint-disable-next-line
  getLegacyAddress(xpub: string, account: number, index: number): string {
    const pubkey = new zec.HDPublicKey(xpub);
    const child = pubkey.derive(account).derive(index);
    const address = new zec.Address(child.publicKey, zec.Networks.livenet);
    return address.toString();
  }

  getAddress(
    derivationMode: string,
    xpub: string,
    account: number,
    index: number
  ): string {
    return this.getLegacyAddress(xpub, account, index);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDerivationMode(address: string) {
    return DerivationModes.LEGACY;
  }

  toOutputScript(address: string) {
    if (!this.validateAddress(address)) {
      throw new Error("Invalid address");
    }
    // TODO find a better way to calculate the script from zec address instead of converting to bitcoin address
    return toOutputScript(
      ZCash.toBitcoinAddr(address),
      coininfo.bitcoin.main.toBitcoinJS()
    );
  }

  // eslint-disable-next-line class-methods-use-this
  validateAddress(address: string): boolean {
    return zec.Address.isValid(address, "livenet");
  }

  // eslint-disable-next-line class-methods-use-this
  isTaprootAddress(address: string): boolean {
    return false;
  }
}

export default ZCash;
