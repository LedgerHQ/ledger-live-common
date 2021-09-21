import BigNumber from 'bignumber.js';
import { ICrypto } from '../crypto/types';
import { Output } from '../storage/types';
// eslint-disable-next-line import/no-cycle
import Xpub from '../xpub';

// eslint-disable-next-line import/prefer-default-export
export abstract class PickingStrategy {
  crypto: ICrypto;

  derivationMode: string;

  // TODO Write tests for excluded UTXOs
  excludedUTXOs: Array<{
    hash: string;
    outputIndex: number;
  }>;

  constructor(
    crypto: ICrypto,
    derivationMode: string,
    excludedUTXOs: Array<{
      hash: string;
      outputIndex: number;
    }>
  ) {
    this.crypto = crypto;
    this.derivationMode = derivationMode;
    this.excludedUTXOs = excludedUTXOs;
  }

  abstract selectUnspentUtxosToUse(
    xpub: Xpub,
    amount: BigNumber,
    feePerByte: number,
    nbOutputsWithoutChange: number
  ): Promise<{
    unspentUtxos: Output[];
    totalValue: BigNumber;
    fee: number;
    needChangeoutput: boolean;
  }>;
}
