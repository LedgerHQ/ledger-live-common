import { Address } from "./storage/types";

export interface IWallet {
  on(event: "address-syncing", listener: () => void): this;
  on(event: "address-synced", listener: () => void): this;
  on(event: "account-syncing", listener: () => void): this;
  on(event: "account-synced", listener: () => void): this;
  on(event: "derivationMode-syncing", listener: () => void): this;
  on(event: "derivationMode-synced", listener: () => void): this;
  on(event: "syncing", listener: () => void): this;
  on(event: "synced", listener: () => void): this;

  sync(): Promise<void>;
  _whenSynced(): Promise<void>;

  syncAddress(
    derivationMode: string,
    account: number,
    index: number
  ): Promise<number>;
  syncAccount(derivationMode: string, account: number): Promise<number>;
  syncDerivationMode(derivationMode: string): Promise<number>;

  getDerivationModeAccounts(derivationMode: string): Promise<number[]>;

  getWalletBalance(): Promise<number>;
  getDerivationModeBalance(derivationMode: string): Promise<number>;
  getAccountBalance(derivationMode: string, account: number): Promise<number>;
  getAddressesBalance(addresses: Address[]): Promise<number>;
  getAddressBalance(address: Address): Promise<number>;

  getWalletAddresses(): Promise<Address[]>;
  getDerivationModeAddresses(derivationMode: string): Promise<Address[]>;
  getAccountAddresses(
    derivationMode: string,
    account: number
  ): Promise<Address[]>;
  getNewAccountChangeAddress(derivationMode: string, account: number): Promise<string>;

  // TODO handle returning the next account available from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  // getNextAccount(derivationMode: string): Promise<number>;

  // TODO handle building a tx from locally stored blockchain data
  // wait for sync to finish if sync is ongoing
  // buildTx()

  // TODO handle broadcasting a tx, inserting the pending transaction in storage ?
  // broadcastTx() {}
}
