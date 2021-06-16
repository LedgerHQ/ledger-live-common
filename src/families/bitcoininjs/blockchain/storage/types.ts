export interface TX {
  account: number;
  index: number;
  block: Block;
  address: string;
  derivationMode: string;
}

export interface Block {
  height: number;
  hash: string;
}

export interface IStorage {
  appendAddressTxs(txs: TX[]): Promise<void>;
  getAddressLastBlock(
    derivationMode: string,
    account: number,
    index: number
  ): Promise<Block | undefined>;
  getAccountLastIndex(
    derivationMode: string,
    account: number
  ): Promise<number | undefined>;
  getDerivationModeLastAccount(
    derivationMode: string
  ): Promise<number | undefined>;
  getUniquesAddresses(addressesFilter: {
    derivationMode?: string,
    account?: number,
  }): Promise<string[]>;
  getDerivationModeUniqueAccounts(derivationMode: string): Promise<number[]>;
  toString(): Promise<string>;
  load(file: string): Promise<void>;
}
