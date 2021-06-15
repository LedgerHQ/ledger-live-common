export interface IStorage {
  appendAddressTxs(derivationMode, account, index, address, txs): void;
  getAddressLastBlock(derivationMode, account, index, address): any | undefined;
  getAccountLastIndex(derivationMode, account): number | undefined;
  getDerivationModeLastAccount(derivationMode): number | undefined;
}
