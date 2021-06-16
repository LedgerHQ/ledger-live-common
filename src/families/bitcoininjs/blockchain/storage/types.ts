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
  dump(file: string): Promise<void>;
  load(file: string): Promise<void>;
}
