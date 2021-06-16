export interface TX {
  account: number;
  index: number;
  block: Block;
  address: string;
  derivationMode: string;
  inputs: Input[],
  outputs: Output[],
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

export interface Details {
  derivationMode: string,
  account: number,
  index: number,
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
    index?: number,
  }): Promise<string[]>;
  getUniquesAddressesMap(addressesFilter: {
    derivationMode?: string,
    account?: number,
    index?: number,
  }): Promise<boolean[]>;
  getAddressDetails(address:string): Promise<Details>;
  getOutputsToInternalWalletAddresses(outputsFilter: {
    derivationMode?: string,
    account?: number,
    index?: number,
  }): Promise<Output[]>;
  getInputsFromInternalWalletAddresses(inputsFilter: {
    derivationMode?: string,
    account?: number,
    index?: number
  }): Promise<Input[]>;
  getDerivationModeUniqueAccounts(derivationMode: string): Promise<number[]>;
  toString(): Promise<string>;
  load(file: string): Promise<void>;
}
