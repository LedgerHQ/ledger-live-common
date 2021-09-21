// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { toOutputScript } from 'bitcoinjs-lib/src/address';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import bitcore from 'bitcore-lib';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import zec from 'bitcore-lib-zcash';
import bs58check from 'bs58check';
import { DerivationModes } from '../types';
import { ICrypto, DerivationMode } from './types';

class ZCash implements ICrypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  network: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor({ network }: { network: any }) {
    this.network = network;
    this.network.dustThreshold = 10000;
    this.network.dustPolicy = 'FIXED';
    this.network.usesTimestampedTransaction = false;
  }

  derivationMode: DerivationMode = {
    LEGACY: DerivationModes.LEGACY,
  };

  // eslint-disable-next-line
  baddrToTaddr(baddrStr: string) {
    const baddr = bs58check.decode(baddrStr).slice(1);
    const taddr = new Uint8Array(22);
    taddr.set(baddr, 2);
    taddr.set([0x1c, 0xb8], 0);
    return bs58check.encode(Buffer.from(taddr));
  }

  // eslint-disable-next-line
  getLegacyAddress(xpub: string, account: number, index: number): string {
    const pubkey = new bitcore.HDPublicKey(xpub);
    const child = pubkey.derive(account).derive(index);
    const address = new bitcore.Address(child.publicKey, zec.Networks.livenet);
    return this.baddrToTaddr(address.toString());
  }

  getAddress(derivationMode: string, xpub: string, account: number, index: number): string {
    return this.getLegacyAddress(xpub, account, index);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDerivationMode(address: string) {
    return this.derivationMode.LEGACY;
  }

  toOutputScript(address: string) {
    return toOutputScript(address, this.network);
  }

  // eslint-disable-next-line class-methods-use-this
  validateAddress(address: string): boolean {
    const { Address } = zec;
    return Address.isValid(address, 'livenet');
  }
}

export default ZCash;
