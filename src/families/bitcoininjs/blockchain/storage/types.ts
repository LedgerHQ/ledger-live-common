export interface TX {
  id: string,
  account: number;
  index: number;
  block: Block;
  address: string;
  derivationMode: string;
  inputs: Input[];
  outputs: Output[];
  unspentUtxos: Output[];
  spentUtxos: Input[];
}

export interface Input {
  value: number;
  address: string;
  output_hash: string;
  output_index: number;
}

export interface Output {
  value: number;
  address: string;
  output_hash: string,
  output_index: number;
}

export interface Block {
  height: number;
  hash: string;
}

export interface Address {
  derivationMode: string,
  account: number,
  index: number,
  address: string,
}

export interface IStorage {
  appendAddressTxs(txs: TX[]): Promise<number>;
  getLastTx(txFilter: {
    derivationMode?: string,
    account?: number,
    index?: number,
  }): Promise<TX | undefined>;
  getUniquesAddresses(addressesFilter: {
    derivationMode?: string,
    account?: number,
    index?: number,
  }): Promise<Address[]>;
  getDerivationModeUniqueAccounts(derivationMode: string): Promise<number[]>;
  toString(sort?: (txs: TX[]) => TX[]): Promise<string>;
  load(file: string): Promise<void>;
}
