import { IStorage, TX, Block } from "./types";
import { findLast, sortBy } from "lodash";
import fs from "fs";

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

  async dump(file: string) {
    //
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
