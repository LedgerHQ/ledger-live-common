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

class Zen implements ICrypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  network: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor({ network }: { network: any }) {
    // refer to https://github.com/HorizenOfficial/zen/blob/master/src/chainparams.cpp for the blockchain params
    this.network = network;
    this.network.versions = {
      bip32: {
        public: 0x043587cf,
        private: 0x04358394,
      },
      bip44: 121,
      private: 0x80,
      public: 0x2096,
      scripthash: 0x2089,
    };
    this.network.name = 'Zencash';
    this.network.unit = 'ZEN';
    this.network.messagePrefix = 'Zencash Signed Message:\n';
    this.network.wif = 0x80;
    this.network.pubKeyHash = 0x2096;
    this.network.scriptHash = 0x2089;
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
    // refer to https://github.com/HorizenOfficial/zen/blob/61a80eefbf08ac1c5625113deeeba61ba93f6eab/src/chainparams.cpp#L118
    taddr.set([0x20, 0x89], 0);
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
    const res = bs58check.decodeUnsafe(address);
    if (!res) return false;
    // refer to https://github.com/LedgerHQ/lib-ledger-core/blob/fc9d762b83fc2b269d072b662065747a64ab2816/core/src/wallet/bitcoin/networks.cpp#L142
    return res && res.length > 3 && res[0] === 0x20 && (res[1] === 0x89 || res[1] === 0x96);
  }
}

export default Zen;
