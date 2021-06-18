export interface TX {
  id: string,
  account: number;
  index: number;
  block: Block;
  address: string;
  derivationMode: string;
  inputs: Input[];
  outputs: Output[];
  balance: number;
}

export interface Input {
  value: number;
  address: string;
}

export interface Output {
  value: number;
  address: string;
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
  appendAddressTxs(txs: TX[]): Promise<void>;
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
