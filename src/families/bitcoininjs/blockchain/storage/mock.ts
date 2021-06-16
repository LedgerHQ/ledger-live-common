import { IStorage, TX } from "./types";
import { findLast, sortBy, filter, uniq } from "lodash";
import fs from "fs";
import mkdirp from "mkdirp";

// a mock storage class that just use js objects
class Mock implements IStorage {
  txs: TX[] = [];

  async getDerivationModeLastAccount(derivationMode: string) {
    return (findLast(this.txs, { derivationMode }) || {}).account;
  }

  async getAccountLastIndex(derivationMode: string, account: number) {
    return (findLast(this.txs, { derivationMode, account }) || {}).index;
  }

  async getAddressLastBlock(
    derivationMode: string,
    account: number,
    index: number
  ) {
    return (findLast(this.txs, { derivationMode, account, index }) || {}).block;
  }

  async appendAddressTxs(txs: TX[]) {
    this.txs = this.txs.concat(txs);
  }

  async getUniquesAddresses(addressesFilter) {
    return uniq(filter(this.txs, addressesFilter).map((tx) => tx.address));
  }

  async getDerivationModeUniqueAccounts(derivationMode: string) {
    return uniq(filter(this.txs, { derivationMode }).map((tx) => tx.account));
  }

  async dump(file: string) {
    await mkdirp(file);
    fs.writeFileSync(
      file,
      JSON.stringify(
        sortBy(this.txs, [
          "derivationMode",
          "account",
          "index",
          "block.height",
        ]),
        null,
        2
      )
    );
  }
  async load(file: string) {
    //
    this.txs = JSON.parse(fs.readFileSync(file).toString());
  }
}

export default Mock;
