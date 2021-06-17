import { IStorage, TX } from "./types";
import { findLast, filter, uniq, orderBy, uniqBy } from "lodash";
import fs from "fs";

// a mock storage class that just use js objects
class Mock implements IStorage {
  txs: TX[] = [];

  async getLastTx(txFilter) {
    return findLast(this.txs, txFilter);
  }

  async appendAddressTxs(txs: TX[]) {
    if (!txs.length) {
      return;
    }
    this.txs.splice(this.txs.length, 0, ...txs);
  }

  async getUniquesAddresses(addressesFilter) {
    return uniqBy(
      filter(this.txs, addressesFilter).map((tx) => ({
        address: tx.address,
        derivationMode: tx.derivationMode,
        account: tx.account,
        index: tx.index,
      })),
      "address"
    );
  }

  async getDerivationModeUniqueAccounts(derivationMode: string) {
    return uniq(filter(this.txs, { derivationMode }).map((tx) => tx.account));
  }

  async toString() {
    // sorting so that it always output the same
    return JSON.stringify(
      orderBy(this.txs, [
        "derivationMode",
        "account",
        "index",
        "block.height",
        "id",
      ]),
      null,
      2
    );
  }
  async load(file: string) {
    //
    this.txs = JSON.parse(fs.readFileSync(file).toString());
  }
}

export default Mock;
