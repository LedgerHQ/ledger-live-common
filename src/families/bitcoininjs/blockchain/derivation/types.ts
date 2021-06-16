// all things derivation
export interface DerivationMode {
  [index: string]: string;
}

export interface IDerivation {
  network: any;
  DerivationMode: DerivationMode;
  getAddress(
    derivationMode: string,
    xpub: string,
    account: number,
    index: number
  ): string;
  getDerivationMode(address: string): string;
}
