import BigNumber from 'bignumber.js';
import { Address, Input } from './storage/types';

export enum DerivationModes {
  LEGACY = 'Legacy',
  NATIVE_SEGWIT = 'Native SegWit',
  SEGWIT = 'SegWit',
}

export type InputInfo = Input & { txHex: string };

export type OutputInfo = {
  script: Buffer;
  value: BigNumber;
  address: string;
  isChange: boolean;
};

// Used when building a transaction to sign and broadcast
export type TransactionInfo = {
  inputs: InputInfo[];
  associatedDerivations: [number, number][];
  outputs: OutputInfo[];
  fee: number;
  changeAddress: Address;
};
